import "server-only";
import { getAiProvider, interpretationModel } from "@/lib/ai";
import { generateStructured } from "@/lib/ai/structured";
import { trackServerEvent } from "@/lib/analytics/server";
import type { Actor } from "@/lib/auth/actor";
import { getEnv } from "@/lib/config/env";
import { db } from "@/lib/db";
import { hasPremiumAccess } from "@/lib/entitlements";
import { AppError } from "@/lib/http/errors";
import { logger } from "@/lib/logger";
import { availableFeatures } from "@/lib/palmistry/features";
import { composeRuleBasedReading, matchRules } from "@/lib/palmistry/interpretation";
import { stageMetrics } from "@/lib/perf/timing";
import {
  getOwnedReading,
  parseStoredAnalysis,
  parseStoredInterpretation,
} from "@/lib/readings/service";
import { GeneratedDetailedSchema } from "@/lib/schemas/palm-interpretation";
import {
  DETAILED_PROMPT_VERSION,
  INTERPRETATION_SYSTEM_PROMPT,
  buildDetailedPrompt,
} from "@/prompts/palm-interpretation";
import { groundInterpretation } from "./grounding";
import { runOnce } from "./idempotency";
import { finalizeInterpretation } from "./interpret";

/** A claim older than this is treated as abandoned (the request died mid-way). */
const STALE_CLAIM_MINUTES = 5;

export type DetailedStatus = "COMPLETE";

/**
 * Write the detailed reading for an unlocked reading. The free reading only
 * contains the main reading; the detailed part is generated here, once, after
 * a verified purchase (or credit, gift or membership) unlocks it.
 *
 * Safe to call repeatedly: one request claims the work (a flag in the stored
 * JSON, so no extra column is needed), concurrent callers get 409 and poll,
 * and a completed reading returns immediately.
 */
export async function generateDetailedReading(
  readingId: string,
  actor: Actor,
): Promise<{ readingId: string; status: DetailedStatus }> {
  return runOnce("detailed", readingId, () => run(readingId, actor));
}

async function run(
  readingId: string,
  actor: Actor,
): Promise<{ readingId: string; status: DetailedStatus }> {
  const reading = await getOwnedReading(readingId, actor);
  const stored = reading.interpretation
    ? parseStoredInterpretation(reading.interpretation.data)
    : null;
  if (!stored || reading.status !== "COMPLETE") {
    throw new AppError("CONFLICT", { message: "This reading isn't ready yet." });
  }
  if (!stored.detailedPending) return { readingId, status: "COMPLETE" };
  if (!(await hasPremiumAccess({ readingId: reading.id, ownerUserId: reading.userId }))) {
    throw new AppError("FORBIDDEN", { message: "Unlock the detailed reading to see it." });
  }

  const claimed = await db.$executeRaw`
    UPDATE "PalmInterpretation"
    SET data = jsonb_set(data, '{detailedClaimedAt}', to_jsonb(now()::text), true)
    WHERE "readingId" = ${reading.id}
      AND data->>'detailedPending' = 'true'
      AND (
        data->>'detailedClaimedAt' IS NULL
        OR (data->>'detailedClaimedAt')::timestamptz < now() - make_interval(mins => ${STALE_CLAIM_MINUTES}::int)
      )`;
  if (claimed === 0) {
    throw new AppError("CONFLICT", {
      message: "Your detailed reading is being written. Please wait a moment.",
    });
  }

  const started = performance.now();
  try {
    const analysis = parseStoredAnalysis(reading.analysis?.data);
    if (!analysis)
      throw new AppError("INTERNAL_ERROR", { internal: "Stored analysis failed validation" });

    const env = getEnv();
    const provider = getAiProvider();
    const rules = matchRules(analysis);
    const available = availableFeatures(analysis);
    const sections = composeRuleBasedReading(analysis).sections.map((s) => s.id);
    const hand = reading.hand === "LEFT" ? "left" : "right";

    const result = await generateStructured({
      provider,
      task: "palm_detailed_reading",
      model: interpretationModel(provider),
      system: INTERPRETATION_SYSTEM_PROMPT,
      prompt: buildDetailedPrompt({
        analysis,
        hand,
        available,
        rules,
        sections,
        narrative: stored.narrative ?? null,
      }),
      schema: GeneratedDetailedSchema,
      maxTokens: 10000,
      timeoutMs: env.AI_TIMEOUT_MS,
      maxAttempts: env.AI_MAX_ATTEMPTS,
      thinking: env.AI_INTERPRETATION_THINKING,
      check: (value) => {
        const grounded = groundInterpretation({ ...stored, ...value }, analysis);
        const problems: string[] = [];
        if (grounded.invalidCitations > 3) {
          problems.push(
            `You cited or wrote about features that are not in AVAILABLE FEATURES. Only use: ${[...available.keys()].join(", ")}`,
          );
        }
        if (grounded.interpretation.sections.length === 0) {
          problems.push("No section cited valid features in basedOn.");
        }
        return problems;
      },
    });

    const { interpretation, removed } = finalizeInterpretation(
      { ...stored, ...result.data, detailedPending: false },
      analysis,
    );
    if (removed > 0) logger.info("detailed_filtered", { readingId, removed });

    // Merge only the detailed parts, so translations written meanwhile are kept.
    const detailed = {
      sections: interpretation.sections,
      lines: interpretation.lines,
      mounts: interpretation.mounts,
      fingers: interpretation.fingers,
      markings: interpretation.markings,
    };
    await db.$executeRaw`
      UPDATE "PalmInterpretation"
      SET data = (data - 'detailedPending' - 'detailedClaimedAt') || ${JSON.stringify(detailed)}::jsonb,
          "removedCount" = "removedCount" + ${removed},
          "promptVersion" = ${`${reading.interpretation!.promptVersion}+${DETAILED_PROMPT_VERSION}`}
      WHERE "readingId" = ${reading.id}`;

    await trackServerEvent("ai_stage_completed", {
      userId: reading.userId,
      readingId: reading.id,
      properties: stageMetrics({
        stage: "detailed",
        totalMs: performance.now() - started,
        providerMs: result.providerMs,
        attempts: result.attempts,
        provider: provider.name,
        model: result.model,
        usage: result.usage,
      }),
    });
    return { readingId, status: "COMPLETE" };
  } catch (error) {
    // Release the claim so the next request can try again.
    await db.$executeRaw`
      UPDATE "PalmInterpretation" SET data = data - 'detailedClaimedAt'
      WHERE "readingId" = ${reading.id}`.catch(() => undefined);
    throw error;
  }
}
