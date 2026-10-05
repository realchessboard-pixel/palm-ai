import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { Language } from "@/lib/i18n/languages";
import type { PalmInterpretation } from "@/lib/schemas/palm-interpretation";
import { projectInterpretation } from "./projection";
import { applyTexts, collectTexts } from "./translation-texts";

/**
 * Translations are cached inside the stored interpretation JSON, under
 * `translations[language][textId] = { t: text, h: hash of the English source }`.
 * Keeping them there needs no schema change, and they are deleted with the
 * reading and dropped automatically if the reading is regenerated.
 */
const CachedLanguageSchema = z.record(z.string(), z.object({ t: z.string(), h: z.string() }));
export type CachedLanguage = z.infer<typeof CachedLanguageSchema>;

export function sourceHash(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

export function readCachedTranslation(data: unknown, language: Language): CachedLanguage {
  const raw = (data as { translations?: Record<string, unknown> } | null)?.translations?.[language];
  const parsed = CachedLanguageSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : {};
}

/** The cached translations that still match their English source, and what's missing. */
export function resolveTranslation(
  source: ReadonlyMap<string, string>,
  cache: CachedLanguage,
): { texts: Map<string, string>; missing: string[] } {
  const texts = new Map<string, string>();
  const missing: string[] = [];
  for (const [id, text] of source) {
    const hit = cache[id];
    if (hit && hit.h === sourceHash(text)) texts.set(id, hit.t);
    else missing.push(id);
  }
  return { texts, missing };
}

/**
 * Localize an interpretation for display. Only texts the viewer can see are
 * required; `missing` > 0 means a translation still has to be produced.
 */
export function localizeInterpretation(
  interpretation: PalmInterpretation,
  data: unknown,
  language: Language,
  premium: boolean,
): { interpretation: PalmInterpretation; missing: number } {
  if (language === "en") return { interpretation, missing: 0 };
  const visible = collectTexts(projectInterpretation(interpretation, premium).interpretation);
  const { texts, missing } = resolveTranslation(visible, readCachedTranslation(data, language));
  return { interpretation: applyTexts(interpretation, texts), missing: missing.length };
}
