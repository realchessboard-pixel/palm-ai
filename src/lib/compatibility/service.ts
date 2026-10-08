import "server-only";
import type { Prisma } from "@prisma/client";
import { getAiProvider, premiumModel, premiumThinking } from "@/lib/ai";
import { generateStructured } from "@/lib/ai/structured";
import { trackServerEvent } from "@/lib/analytics/server";
import type { Actor } from "@/lib/auth/actor";
import { getEnv } from "@/lib/config/env";
import { db } from "@/lib/db";
import { AppError, isAppError } from "@/lib/http/errors";
import {
  getOwnedCompatibility,
  hasCompatibilityAccess,
} from "@/lib/monetization/compatibility-access";
import { availableFeatures } from "@/lib/palmistry/features";
import { matchRules } from "@/lib/palmistry/interpretation";
import { stageMetrics } from "@/lib/perf/timing";
import { runOnce } from "@/lib/pipeline/idempotency";
import { getOwnedReading, parseStoredAnalysis } from "@/lib/readings/service";
import {
  COMPATIBILITY_PROMPT_VERSION,
  COMPATIBILITY_SYSTEM_PROMPT,
  buildCompatibilityPrompt,
} from "./prompt";
import { composeRuleBasedCompatibility, finalizeCompatibility } from "./finalize";
import {
  CompatibilityReadingSchema,
  GeneratedCompatibilitySchema,
  type CompatibilityReading,
} from "./schema";

const STALE_GENERATING_MS = 5 * 60 * 1000;

export interface CompatibilityView {
  id: string;
  readingId: string;
  status: "LOCKED" | "GENERATING" | "COMPLETE" | "FAILED";
  unlocked: boolean;
  isDemo: boolean;
  createdAt: string;
  /** Only present once unlocked and written. */
  reading: CompatibilityReading | null;
}

/**
 * Pair the visitor's own reading with their partner's freshly analysed palm.
 * Both must belong to the same visitor; the partner's palm is analysis-only.
 */
export async function createCompatibility(
  input: { readingId: string; partnerReadingId: string },
  actor: Actor,
): Promise<{ compatibilityId: string }> {
  const [self, partner] = await Promise.all([
    getOwnedReading(input.readingId, actor),
    getOwnedReading(input.partnerReadingId, actor),
  ]);
  if (self.role !== "SELF" || partner.role !== "PARTNER" || self.id === partner.id) {
    throw new AppError("VALIDATION_ERROR", {
      message: "Please choose your reading and your partner's palm.",
    });
  }
  if (!self.analysis || !partner.analysis) {
    throw new AppError("CONFLICT", { message: "Both palms need to be read first." });
  }
  const compatibility = await db.compatibility.upsert({
    where: { readingId_partnerReadingId: { readingId: self.id, partnerReadingId: partner.id } },
    create: {
      readingId: self.id,
      partnerReadingId: partner.id,
      userId: self.userId,
      guestKeyHash: self.userId ? null : self.guestKeyHash,
    },
    update: {},
  });
  await trackServerEvent("compatibility_created", {
    userId: self.userId,
    readingId: self.id,
    properties: { is_demo: self.isDemo || partner.isDemo },
  });
  return { compatibilityId: compatibility.id };
}

export async function getCompatibilityView(id: string, actor: Actor): Promise<CompatibilityView> {
  const compatibility = await getOwnedCompatibility(id, actor);
  const [unlocked, readings] = await Promise.all([
    hasCompatibilityAccess(compatibility.id),
    db.reading.findMany({
      where: { id: { in: [compatibility.readingId, compatibility.partnerReadingId] } },
      select: { isDemo: true },
    }),
  ]);
  const parsed =
    unlocked && compatibility.data
      ? CompatibilityReadingSchema.safeParse(compatibility.data)
      : null;
  return {
    id: compatibility.id,
    readingId: compatibility.readingId,
    status: compatibility.status,
    unlocked,
    isDemo: readings.some((r) => r.isDemo),
    createdAt: compatibility.createdAt.toISOString(),
    reading: parsed?.success ? parsed.data : null,
  };
}

/**
 * Write the couple reading once it is unlocked. Claim-guarded like the
 * detailed reading: one request writes, others get 409 until it is done.
 */
export function generateCompatibility(
  id: string,
  actor: Actor,
): Promise<{ compatibilityId: string; status: "COMPLETE" }> {
  return runOnce("compatibility", id, () => runGeneration(id, actor));
}

async function runGeneration(
  id: string,
  actor: Actor,
): Promise<{ compatibilityId: string; status: "COMPLETE" }> {
  const compatibility = await getOwnedCompatibility(id, actor);
  if (compatibility.status === "COMPLETE" && compatibility.data) {
    return { compatibilityId: id, status: "COMPLETE" };
  }
  if (!(await hasCompatibilityAccess(id))) {
    throw new AppError("FORBIDDEN", { message: "Unlock the couple reading to see it." });
  }
  const claimed = await db.compatibility.updateMany({
    where: {
      id,
      OR: [
        { status: { in: ["LOCKED", "FAILED"] } },
        { status: "GENERATING", updatedAt: { lt: new Date(Date.now() - STALE_GENERATING_MS) } },
      ],
    },
    data: { status: "GENERATING", errorCode: null },
  });
  if (claimed.count === 0) {
    throw new AppError("CONFLICT", {
      message: "Your couple reading is being written. Please wait a moment.",
    });
  }

  const started = performance.now();
  try {
    const [self, partner] = await Promise.all([
      db.reading.findUniqueOrThrow({
        where: { id: compatibility.readingId },
        include: { analysis: true },
      }),
      db.reading.findUniqueOrThrow({
        where: { id: compatibility.partnerReadingId },
        include: { analysis: true },
      }),
    ]);
    const you = parseStoredAnalysis(self.analysis?.data);
    const them = parseStoredAnalysis(partner.analysis?.data);
    if (!you || !them)
      throw new AppError("INTERNAL_ERROR", { internal: "Stored analysis invalid" });

    let raw: CompatibilityReading;
    let provider = "rules";
    let model = "palmistry-rules-v1";
    let metrics: Parameters<typeof stageMetrics>[0] | null = null;
    if (self.isDemo || partner.isDemo) {
      raw = composeRuleBasedCompatibility(you, them);
    } else {
      const env = getEnv();
      const ai = getAiProvider();
      const result = await generateStructured({
        provider: ai,
        task: "palm_compatibility",
        model: premiumModel(ai),
        system: COMPATIBILITY_SYSTEM_PROMPT,
        prompt: buildCompatibilityPrompt({
          you: { analysis: you, available: availableFeatures(you), rules: matchRules(you) },
          partner: { analysis: them, available: availableFeatures(them), rules: matchRules(them) },
        }),
        schema: GeneratedCompatibilitySchema,
        maxTokens: 12000,
        timeoutMs: env.AI_TIMEOUT_MS,
        maxAttempts: env.AI_MAX_ATTEMPTS,
        thinking: premiumThinking(),
        check: (value) => {
          const done = finalizeCompatibility(value, you, them);
          if (!done) return ["Each part must cite listed features (you.<key> / partner.<key>)."];
          return done.invalidCitations > 3
            ? [
                "You cited features that were not listed. Only cite the listed you.* and partner.* keys.",
              ]
            : [];
        },
      });
      raw = result.data;
      provider = ai.name;
      model = result.model;
      metrics = {
        stage: "compatibility",
        totalMs: 0,
        providerMs: result.providerMs,
        attempts: result.attempts,
        provider,
        model,
        usage: result.usage,
      };
    }

    const final = finalizeCompatibility(raw, you, them);
    if (!final) throw new AppError("AI_INVALID_RESPONSE");
    await db.compatibility.update({
      where: { id },
      data: {
        status: "COMPLETE",
        data: final.reading as unknown as Prisma.InputJsonValue,
        provider,
        model: `${model} (${COMPATIBILITY_PROMPT_VERSION})`,
        completedAt: new Date(),
      },
    });
    if (metrics) {
      await trackServerEvent("ai_stage_completed", {
        userId: self.userId,
        readingId: self.id,
        properties: stageMetrics({ ...metrics, totalMs: performance.now() - started }),
      });
    }
    return { compatibilityId: id, status: "COMPLETE" };
  } catch (error) {
    await db.compatibility
      .update({
        where: { id },
        data: { status: "FAILED", errorCode: isAppError(error) ? error.code : "INTERNAL_ERROR" },
      })
      .catch(() => undefined);
    throw error;
  }
}
