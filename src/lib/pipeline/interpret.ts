import "server-only";
import type { Prisma } from "@prisma/client";
import { getAiProvider, interpretationModel } from "@/lib/ai";
import { generateStructured } from "@/lib/ai/structured";
import { trackServerEvent } from "@/lib/analytics/server";
import type { Actor } from "@/lib/auth/actor";
import { getEnv } from "@/lib/config/env";
import { db } from "@/lib/db";
import { AppError, isAppError } from "@/lib/http/errors";
import { logger } from "@/lib/logger";
import { availableFeatures } from "@/lib/palmistry/features";
import { composeRuleBasedReading, matchRules } from "@/lib/palmistry/interpretation";
import { getOwnedReading, parseStoredAnalysis } from "@/lib/readings/service";
import type { PalmAnalysis } from "@/lib/schemas/palm-analysis";
import {
  INTERPRETATION_SCHEMA_VERSION,
  PalmInterpretationSchema,
  type PalmInterpretation,
} from "@/lib/schemas/palm-interpretation";
import {
  INTERPRETATION_PROMPT_VERSION,
  INTERPRETATION_SYSTEM_PROMPT,
  buildInterpretationPrompt,
} from "@/prompts/palm-interpretation";
import { groundInterpretation } from "./grounding";
import { sanitizeInterpretation } from "./safety";

const STALE_INTERPRETING_MS = 5 * 60 * 1000;
const RULES_ENGINE = { provider: "rules", model: "palmistry-rules-v1" };

/** Ground + safety-filter any interpretation, then re-validate the result. */
export function finalizeInterpretation(
  raw: PalmInterpretation,
  analysis: PalmAnalysis,
): { interpretation: PalmInterpretation; removed: number } {
  const grounded = groundInterpretation(raw, analysis);
  const safe = sanitizeInterpretation(grounded.interpretation);
  const parsed = PalmInterpretationSchema.safeParse(safe.interpretation);
  if (!parsed.success) {
    throw new AppError("AI_INVALID_RESPONSE", { internal: parsed.error });
  }
  return { interpretation: parsed.data, removed: grounded.removed + safe.removed };
}

async function generateWithModel(analysis: PalmAnalysis, hand: "left" | "right") {
  const env = getEnv();
  const provider = getAiProvider();
  const rules = matchRules(analysis);
  const available = availableFeatures(analysis);
  const sections = composeRuleBasedReading(analysis).sections.map((s) => s.id);

  const result = await generateStructured({
    provider,
    task: "palm_interpretation",
    model: interpretationModel(provider),
    system: INTERPRETATION_SYSTEM_PROMPT,
    prompt: buildInterpretationPrompt({ analysis, hand, available, rules, sections }),
    schema: PalmInterpretationSchema,
    maxTokens: 12000,
    timeoutMs: env.AI_TIMEOUT_MS,
    maxAttempts: env.AI_MAX_ATTEMPTS,
    check: (value) => {
      const grounded = groundInterpretation(value, analysis);
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
  return {
    raw: result.data,
    provider: provider.name,
    model: result.model,
    attempts: result.attempts,
  };
}

export async function interpretReading(
  readingId: string,
  actor: Actor,
): Promise<{ readingId: string; status: "COMPLETE" }> {
  const reading = await getOwnedReading(readingId, actor);
  if (reading.status === "COMPLETE" && reading.interpretation)
    return { readingId, status: "COMPLETE" };
  if (!reading.analysis || reading.status === "REJECTED") {
    throw new AppError("CONFLICT", {
      message: "This reading can't be completed. Please start a new one.",
    });
  }

  // Claim the reading so concurrent requests don't generate twice.
  const claimed = await db.reading.updateMany({
    where: {
      id: reading.id,
      OR: [
        { status: { in: ["ANALYZED", "FAILED"] } },
        { status: "INTERPRETING", updatedAt: { lt: new Date(Date.now() - STALE_INTERPRETING_MS) } },
      ],
    },
    data: { status: "INTERPRETING", errorCode: null },
  });
  if (claimed.count === 0) {
    throw new AppError("CONFLICT", {
      message: "Your reading is already being prepared. Please wait a moment.",
    });
  }

  try {
    const analysis = parseStoredAnalysis(reading.analysis.data);
    if (!analysis)
      throw new AppError("INTERNAL_ERROR", { internal: "Stored analysis failed validation" });

    // Demo readings were built from sample features, so they use the rules engine
    // even if a real AI provider has been configured since.
    const generated = reading.isDemo
      ? { raw: composeRuleBasedReading(analysis), ...RULES_ENGINE, attempts: 1 }
      : await generateWithModel(analysis, reading.hand === "LEFT" ? "left" : "right");

    const { interpretation, removed } = finalizeInterpretation(generated.raw, analysis);
    if (removed > 0) logger.info("interpretation_filtered", { readingId, removed });

    await db.$transaction([
      db.palmInterpretation.upsert({
        where: { readingId: reading.id },
        create: {
          readingId: reading.id,
          data: interpretation as unknown as Prisma.InputJsonValue,
          schemaVersion: INTERPRETATION_SCHEMA_VERSION,
          promptVersion: reading.isDemo ? "rules" : INTERPRETATION_PROMPT_VERSION,
          provider: generated.provider,
          model: generated.model,
          removedCount: removed,
          attempts: generated.attempts,
        },
        update: {
          data: interpretation as unknown as Prisma.InputJsonValue,
          provider: generated.provider,
          model: generated.model,
          removedCount: removed,
          attempts: generated.attempts,
        },
      }),
      db.reading.update({
        where: { id: reading.id },
        data: { status: "COMPLETE", completedAt: new Date() },
      }),
    ]);

    await trackServerEvent("analysis_completed", {
      userId: reading.userId,
      readingId: reading.id,
      properties: { provider: generated.provider, demo: reading.isDemo },
    });
    return { readingId, status: "COMPLETE" };
  } catch (error) {
    const code = isAppError(error) ? error.code : "INTERNAL_ERROR";
    await db.reading
      .update({ where: { id: reading.id }, data: { status: "ANALYZED", errorCode: code } })
      .catch(() => undefined);
    await trackServerEvent("analysis_failed", {
      userId: reading.userId,
      readingId: reading.id,
      properties: { stage: "interpretation", code },
    });
    throw error;
  }
}
