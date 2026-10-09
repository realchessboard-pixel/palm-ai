import "server-only";
import type { Prisma, Reading } from "@prisma/client";
import { analysisModel, getAiProvider } from "@/lib/ai";
import { generateStructured } from "@/lib/ai/structured";
import { trackServerEvent } from "@/lib/analytics/server";
import { getEnv } from "@/lib/config/env";
import { db } from "@/lib/db";
import { AppError, isAppError } from "@/lib/http/errors";
import { processPalmImage } from "@/lib/image/process";
import { QUALITY_MESSAGES } from "@/lib/image/quality";
import { logger } from "@/lib/logger";
import { trackFunnelEvent } from "@/lib/monetization/funnel";
import { PipelineTimer, stageMetrics, usageCounts } from "@/lib/perf/timing";
import { availableFeatures } from "@/lib/palmistry/features";
import { deleteReadingImages } from "@/lib/readings/service";
import {
  ANALYSIS_SCHEMA_VERSION,
  LINE_NAMES,
  PalmAnalysisSchema,
  isObservedLine,
  type PalmAnalysis,
} from "@/lib/schemas/palm-analysis";
import { generateImageKeys, getStorage } from "@/lib/storage";
import {
  ANALYSIS_PROMPT_VERSION,
  ANALYSIS_SYSTEM_PROMPT,
  buildAnalysisPrompt,
} from "@/prompts/palm-analysis";

export interface AnalyzeInput {
  image: Buffer;
  hand: "left" | "right";
  trainingOptIn: boolean;
  userId: string | null;
  guestKeyHash: string | null;
  /** A partner's palm for a couple reading (analysis only; not listed as the user's own). */
  role?: "self" | "partner";
  /** Optional development timing collector. */
  timer?: PipelineTimer;
}

export interface AnalyzeOutput {
  readingId: string;
  status: "ANALYZED";
  isDemo: boolean;
  analysisConfidence: number;
}

/** Minimum palm-visibility confidence before we interpret anything. */
export const MIN_PALM_VISIBILITY = 0.5;
/** Minimum number of confidently observed features for a meaningful reading. */
export const MIN_FEATURES = 3;

const ISSUE_MESSAGES: Record<string, string> = {
  too_dark: QUALITY_MESSAGES.too_dark,
  overexposed: QUALITY_MESSAGES.overexposed,
  blurry: QUALITY_MESSAGES.blurry,
  partial_palm: "Please place your entire palm inside the frame.",
  palm_not_found:
    "We couldn't find a palm in this photo. Please place your entire palm inside the frame.",
  back_of_hand: "This looks like the back of a hand. Please photograph the palm side.",
  obstructed: "Part of your palm is covered. Please show your whole open palm.",
  too_far: "Your hand is too far away. Hold the camera closer, directly above your palm.",
  glare: "There's glare on your palm. Try softer, even light without flash.",
  low_resolution: QUALITY_MESSAGES.low_resolution,
};

/**
 * Decide whether the vision model's own assessment means we should not
 * produce a reading. Returns a friendly reason, or null if the photo is usable.
 */
export function rejectionReason(analysis: PalmAnalysis): string | null {
  const quality = analysis.imageQuality;
  if (!quality.palmVisible || quality.palmVisibilityConfidence < MIN_PALM_VISIBILITY) {
    return quality.issues.includes("back_of_hand")
      ? ISSUE_MESSAGES.back_of_hand
      : "We couldn't clearly find a palm in this photo. Please place your entire palm inside the frame.";
  }
  // A visible palm with readable features goes ahead even if the photo isn't ideal:
  // lower-confidence features are worded more softly rather than refused.
  const linesSeen = LINE_NAMES.filter((n) => isObservedLine(analysis.lines[n])).length;
  if (linesSeen === 0 || availableFeatures(analysis).size < MIN_FEATURES) {
    return "We couldn't make out enough of your palm lines. Try bright, even light and hold the camera directly above your palm.";
  }
  return null;
}

async function markFailed(reading: Reading, code: string) {
  await deleteReadingImages(reading);
  await db.reading
    .update({
      where: { id: reading.id },
      data: {
        status: "FAILED",
        errorCode: code,
        imageKey: null,
        thumbnailKey: null,
        imageDeletedAt: new Date(),
      },
    })
    .catch((error) => logger.error("reading_fail_update_failed", { readingId: reading.id, error }));
}

export async function analyzePalm(input: AnalyzeInput): Promise<AnalyzeOutput> {
  const timer = input.timer ?? new PipelineTimer("analyze");
  try {
    const output = await runAnalysis(input, timer);
    timer.finish("ok");
    return output;
  } catch (error) {
    timer.finish(isAppError(error) ? error.code : "error");
    throw error;
  }
}

/** Free palm reads allowed per device (or account) in any 24 hours. */
export const FREE_PALM_READS_PER_DAY = 2;

/**
 * Caps AI cost from non-buyers. A partner's palm (part of a paid couple
 * reading), unused reading credits and membership are never limited.
 */
async function enforceDailyPalmLimit(input: AnalyzeInput): Promise<void> {
  if (input.role === "partner") return;
  if (!input.userId && !input.guestKeyHash) return;
  if (input.userId) {
    const [user, membership] = await Promise.all([
      db.user.findUnique({ where: { id: input.userId }, select: { readingCredits: true } }),
      db.entitlement.count({
        where: {
          type: "PREMIUM_SUBSCRIPTION",
          userId: input.userId,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      }),
    ]);
    if ((user?.readingCredits ?? 0) > 0 || membership > 0) return;
  }
  const used = await db.reading.count({
    where: {
      role: "SELF",
      createdAt: { gt: new Date(Date.now() - 24 * 60 * 60_000) },
      ...(input.userId ? { userId: input.userId } : { guestKeyHash: input.guestKeyHash }),
    },
  });
  if (used >= FREE_PALM_READS_PER_DAY) {
    throw new AppError("RATE_LIMITED", {
      message: `You've used today's ${FREE_PALM_READS_PER_DAY} free palm readings. Come back tomorrow, or open your detailed reading from your earlier palm.`,
      details: { reason: "daily_free_palm_limit" },
    });
  }
}

async function runAnalysis(input: AnalyzeInput, timer: PipelineTimer): Promise<AnalyzeOutput> {
  await enforceDailyPalmLimit(input);
  const env = getEnv();
  timer.note({ uploadBytes: input.image.length });

  let processed;
  try {
    processed = await processPalmImage(input.image, timer);
    timer.note({
      sentToAi: { bytes: processed.image.length, width: processed.width, height: processed.height },
    });
  } catch (error) {
    if (isAppError(error)) {
      await trackServerEvent("image_rejected", {
        userId: input.userId,
        properties: { stage: "server", reason: error.code },
      });
    }
    throw error;
  }

  // Resolve the provider before storing anything, so misconfiguration leaves no data behind.
  const provider = getAiProvider();
  const storage = getStorage();
  const keys = generateImageKeys();
  await timer.step("storage_write", async () => {
    await Promise.all([
      storage.put(keys.imageKey, processed.image, "image/jpeg"),
      storage.put(keys.thumbnailKey, processed.thumbnail, "image/jpeg"),
    ]);
  });

  let reading: Reading;
  try {
    reading = await timer.step("db_create_reading", () =>
      db.reading.create({
        data: {
          userId: input.userId,
          guestKeyHash: input.userId ? null : input.guestKeyHash,
          hand: input.hand === "left" ? "LEFT" : "RIGHT",
          status: "ANALYZING",
          imageKey: keys.imageKey,
          thumbnailKey: keys.thumbnailKey,
          imageWidth: processed.width,
          imageHeight: processed.height,
          qualityScore: processed.qualityScore,
          trainingOptIn: input.trainingOptIn,
          role: input.role === "partner" ? "PARTNER" : "SELF",
          isDemo: provider.isMock,
          aiProvider: provider.name,
        },
      }),
    );
  } catch (error) {
    await storage.delete(keys.imageKey).catch(() => undefined);
    await storage.delete(keys.thumbnailKey).catch(() => undefined);
    throw error;
  }

  // Analytics never fails (trackServerEvent swallows errors), so it runs alongside the
  // vision call instead of in front of it; it is awaited before returning.
  const analyticsStarted = Promise.all([
    trackServerEvent("analysis_started", {
      userId: input.userId,
      readingId: reading.id,
      properties: { provider: provider.name, hand: input.hand },
    }),
    trackFunnelEvent("reading_started", {
      readingId: reading.id,
      userId: input.userId,
      aiProvider: provider.name,
      model: analysisModel(provider),
      isDemo: provider.isMock,
    }),
  ]);

  let result;
  try {
    result = await generateStructured({
      provider,
      task: "palm_analysis",
      model: analysisModel(provider),
      system: ANALYSIS_SYSTEM_PROMPT,
      prompt: buildAnalysisPrompt({ hand: input.hand }),
      image: { data: processed.image, mediaType: "image/jpeg" },
      schema: PalmAnalysisSchema,
      maxTokens: 6000,
      timeoutMs: env.AI_TIMEOUT_MS,
      maxAttempts: env.AI_MAX_ATTEMPTS,
      hints: { hand: input.hand },
      thinking: env.AI_ANALYSIS_THINKING,
    });
    timer.add("gemini_request", result.providerMs);
    timer.add("ai_validate", result.validateMs);
    timer.note({
      ai: { model: result.model, attempts: result.attempts, usage: usageCounts(result.usage) },
    });
  } catch (error) {
    const code = isAppError(error) ? error.code : "INTERNAL_ERROR";
    await analyticsStarted;
    await markFailed(reading, code);
    await trackServerEvent("analysis_failed", {
      userId: input.userId,
      readingId: reading.id,
      properties: { stage: "analysis", code, provider: provider.name },
    });
    throw error;
  }

  await analyticsStarted;
  await trackServerEvent("ai_stage_completed", {
    userId: input.userId,
    readingId: reading.id,
    properties: stageMetrics({
      stage: "analysis",
      totalMs: timer.elapsedMs(),
      providerMs: result.providerMs,
      attempts: result.attempts,
      provider: provider.name,
      model: result.model,
      usage: result.usage,
    }),
  });

  const analysis = result.data;
  const analysisRecord: Prisma.PalmAnalysisUncheckedCreateInput = {
    readingId: reading.id,
    data: analysis as unknown as Prisma.InputJsonValue,
    schemaVersion: ANALYSIS_SCHEMA_VERSION,
    promptVersion: ANALYSIS_PROMPT_VERSION,
    provider: provider.name,
    model: result.model,
    overallConfidence: analysis.overallConfidence,
    attempts: result.attempts,
  };

  const reason = rejectionReason(analysis);
  if (reason) {
    // Rejected photos are not kept: there is nothing to show the user.
    await deleteReadingImages(reading);
    await db.$transaction([
      db.palmAnalysis.create({ data: analysisRecord }),
      db.reading.update({
        where: { id: reading.id },
        data: {
          status: "REJECTED",
          rejectionReason: reason,
          analysisConfidence: analysis.overallConfidence,
          imageKey: null,
          thumbnailKey: null,
          imageDeletedAt: new Date(),
        },
      }),
    ]);
    await trackServerEvent("image_rejected", {
      userId: input.userId,
      readingId: reading.id,
      properties: {
        stage: "ai",
        reason: analysis.imageQuality.issues[0] ?? "insufficient_features",
      },
    });
    throw new AppError("IMAGE_QUALITY", { message: reason, details: { readingId: reading.id } });
  }

  await timer.step("db_save_analysis", () =>
    db.$transaction([
      db.palmAnalysis.create({ data: analysisRecord }),
      db.reading.update({
        where: { id: reading.id },
        data: { status: "ANALYZED", analysisConfidence: analysis.overallConfidence },
      }),
    ]),
  );
  timer.note({ readingId: reading.id });

  return {
    readingId: reading.id,
    status: "ANALYZED",
    isDemo: provider.isMock,
    analysisConfidence: analysis.overallConfidence,
  };
}
