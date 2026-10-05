import "server-only";
import type { Reading } from "@prisma/client";
import { canAccessReading, type Actor } from "@/lib/auth/actor";
import { db } from "@/lib/db";
import { hasPremiumAccess } from "@/lib/entitlements";
import { AppError } from "@/lib/http/errors";
import { logger } from "@/lib/logger";
import { readingPaymentState } from "@/lib/payments/payment-state";
import { PalmAnalysisSchema, type PalmAnalysis } from "@/lib/schemas/palm-analysis";
import {
  PalmInterpretationSchema,
  type PalmInterpretation,
} from "@/lib/schemas/palm-interpretation";
import { getStorage } from "@/lib/storage";
import { buildReadingView } from "./build-view";
import type { ReadingListItem, ReadingView } from "./view";

/**
 * Load a reading the actor is allowed to see. Unknown and forbidden readings
 * both return NOT_FOUND so that reading ids can't be probed.
 */
export async function getOwnedReading(id: string, actor: Actor) {
  const reading = await db.reading.findUnique({
    where: { id },
    include: { analysis: true, interpretation: true },
  });
  if (!reading || !canAccessReading(actor, reading)) throw new AppError("NOT_FOUND");
  return reading;
}

/** Stored JSON is re-validated on read: never trust what's in the database blindly. */
export function parseStoredAnalysis(data: unknown): PalmAnalysis | null {
  const parsed = PalmAnalysisSchema.safeParse(data);
  if (!parsed.success)
    logger.error("stored_analysis_invalid", { issues: parsed.error.issues.slice(0, 3) });
  return parsed.success ? parsed.data : null;
}

export function parseStoredInterpretation(data: unknown): PalmInterpretation | null {
  const parsed = PalmInterpretationSchema.safeParse(data);
  if (!parsed.success) {
    logger.error("stored_interpretation_invalid", { issues: parsed.error.issues.slice(0, 3) });
  }
  return parsed.success ? parsed.data : null;
}

export async function getReadingView(id: string, actor: Actor): Promise<ReadingView> {
  const reading = await getOwnedReading(id, actor);
  const [premium, paymentState] = await Promise.all([
    hasPremiumAccess({ readingId: reading.id, ownerUserId: reading.userId }),
    readingPaymentState(reading.id),
  ]);
  return buildReadingView({
    paymentState,
    reading,
    analysis: reading.analysis ? parseStoredAnalysis(reading.analysis.data) : null,
    interpretation: reading.interpretation
      ? parseStoredInterpretation(reading.interpretation.data)
      : null,
    premium,
  });
}

export async function listReadingsForUser(userId: string): Promise<ReadingListItem[]> {
  const readings = await db.reading.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      interpretation: { select: { data: true } },
      entitlements: { where: { revokedAt: null }, select: { id: true } },
    },
  });
  return readings.map((r) => {
    const headline = (r.interpretation?.data as { overview?: { headline?: unknown } } | undefined)
      ?.overview?.headline;
    return {
      id: r.id,
      hand: r.hand === "LEFT" ? "left" : "right",
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      hasImage: r.thumbnailKey !== null,
      premium: r.entitlements.length > 0,
      headline: typeof headline === "string" ? headline.slice(0, 140) : null,
    };
  });
}

/** Remove a reading's image files. Safe to call more than once. */
export async function deleteReadingImages(
  reading: Pick<Reading, "id" | "imageKey" | "thumbnailKey">,
) {
  const storage = getStorage();
  for (const key of [reading.imageKey, reading.thumbnailKey]) {
    if (!key) continue;
    try {
      await storage.delete(key);
    } catch (error) {
      // Keep going: the DB row is still removed, and the cleanup job can retry orphans.
      logger.error("image_delete_failed", { readingId: reading.id, error });
    }
  }
}

export async function deleteReading(id: string, actor: Actor): Promise<void> {
  const reading = await getOwnedReading(id, actor);
  await deleteReadingImages(reading);
  await db.reading.delete({ where: { id: reading.id } });
  await db.usageEvent.updateMany({ where: { readingId: reading.id }, data: { readingId: null } });
}

/** Attach readings created as a guest in this browser to the newly signed-in user. */
export async function claimGuestReadings(
  userId: string,
  guestKeyHash: string | null,
): Promise<number> {
  if (!guestKeyHash) return 0;
  const result = await db.reading.updateMany({
    where: { guestKeyHash, userId: null },
    data: { userId },
  });
  return result.count;
}
