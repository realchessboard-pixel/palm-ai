import "server-only";
import { z } from "zod";
import { getAiProvider, interpretationModel } from "@/lib/ai";
import { generateStructured } from "@/lib/ai/structured";
import type { Actor } from "@/lib/auth/actor";
import { getEnv } from "@/lib/config/env";
import { db } from "@/lib/db";
import { hasPremiumAccess } from "@/lib/entitlements";
import { AppError } from "@/lib/http/errors";
import type { Language } from "@/lib/i18n/languages";
import { runOnce } from "@/lib/pipeline/idempotency";
import { translationPrompt, translationSystemPrompt } from "@/prompts/reading-translation";
import { projectInterpretation } from "./projection";
import { getOwnedReading, parseStoredInterpretation } from "./service";
import {
  readCachedTranslation,
  resolveTranslation,
  sourceHash,
  type CachedLanguage,
} from "./translation-cache";
import { collectTexts } from "./translation-texts";

/** Soft cap per AI request; larger readings are translated in parallel chunks. */
const CHUNK_CHARS = 3500;

const TranslationOutputSchema = z.object({
  items: z
    .array(z.object({ id: z.string().min(1).max(80), text: z.string().min(1).max(8000) }))
    .max(200),
});

function chunk(items: { id: string; text: string }[]): { id: string; text: string }[][] {
  const chunks: { id: string; text: string }[][] = [];
  let current: { id: string; text: string }[] = [];
  let size = 0;
  for (const item of items) {
    if (current.length && size + item.text.length > CHUNK_CHARS) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(item);
    size += item.text.length;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

async function translateItems(
  items: { id: string; text: string }[],
  language: Language,
): Promise<Map<string, string>> {
  const provider = getAiProvider();
  // Demo mode has no model to translate with: show the English text.
  if (provider.isMock) return new Map(items.map((i) => [i.id, i.text]));
  const env = getEnv();
  const results = await Promise.all(
    chunk(items).map((part) => {
      const ids = new Set(part.map((i) => i.id));
      return generateStructured({
        provider,
        task: "reading_translation",
        model: interpretationModel(provider),
        system: translationSystemPrompt(language),
        prompt: translationPrompt(part),
        schema: TranslationOutputSchema,
        maxTokens: 12000,
        timeoutMs: env.AI_TIMEOUT_MS,
        maxAttempts: env.AI_MAX_ATTEMPTS,
        thinking: "low",
        check: (value) => {
          const got = new Set(value.items.map((i) => i.id));
          const lost = [...ids].filter((id) => !got.has(id));
          const extra = [...got].filter((id) => !ids.has(id));
          return lost.length || extra.length
            ? [`Return exactly these ids, each once: ${[...ids].join(", ")}`]
            : [];
        },
      });
    }),
  );
  return new Map(results.flatMap((r) => r.data.items.map((i) => [i.id, i.text] as const)));
}

/**
 * Make sure every text the viewer can currently see exists in `language`.
 * Never re-runs the palm analysis or the reading: only missing (or changed)
 * English texts are translated, and concurrent requests share one run.
 */
export async function ensureTranslation(
  readingId: string,
  language: Language,
  actor: Actor,
): Promise<{ translated: number }> {
  if (language === "en") return { translated: 0 };
  const reading = await getOwnedReading(readingId, actor);
  const interpretation =
    reading.status === "COMPLETE" && reading.interpretation
      ? parseStoredInterpretation(reading.interpretation.data)
      : null;
  if (!interpretation) {
    throw new AppError("CONFLICT", { message: "This reading isn't ready to translate yet." });
  }

  const premium = await hasPremiumAccess({ readingId: reading.id, ownerUserId: reading.userId });
  const visible = collectTexts(projectInterpretation(interpretation, premium).interpretation);
  const { missing } = resolveTranslation(
    visible,
    readCachedTranslation(reading.interpretation!.data, language),
  );
  if (missing.length === 0) return { translated: 0 };

  const items = missing.map((id) => ({ id, text: visible.get(id)! }));
  const key = `${language}:${sourceHash(missing.join("|"))}`;
  return runOnce(`translate:${reading.id}`, key, async () => {
    const translated = await translateItems(items, language);
    const patch: CachedLanguage = {};
    for (const item of items) {
      const text = translated.get(item.id);
      if (text) patch[item.id] = { t: text, h: sourceHash(item.text) };
    }
    // One atomic statement, so concurrent languages or top-ups never overwrite each other.
    await db.$executeRaw`
      UPDATE "PalmInterpretation"
      SET data = jsonb_set(
        jsonb_set(data, '{translations}', COALESCE(data->'translations', '{}'::jsonb), true),
        ARRAY['translations', ${language}]::text[],
        COALESCE(data->'translations'->${language}, '{}'::jsonb) || ${JSON.stringify(patch)}::jsonb,
        true
      )
      WHERE "readingId" = ${reading.id}`;
    return { translated: Object.keys(patch).length };
  });
}
