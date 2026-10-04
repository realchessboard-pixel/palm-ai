import "server-only";
import type { AnalyticsEventName } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/server";
import { db } from "@/lib/db";
import { EXTENDED_READING_CURRENCY, EXTENDED_READING_PRICE_INR } from "./price";

export type FunnelEvent = Extract<
  AnalyticsEventName,
  | "reading_started"
  | "basic_reading_completed"
  | "extended_offer_viewed"
  | "extended_checkout_started"
  | "extended_payment_success"
  | "extended_payment_failed"
  | "extended_reading_unlocked"
>;

export interface FunnelContext {
  readingId: string;
  /** Signed-in user, or null for a guest (guests are never identified beyond that). */
  userId: string | null;
  aiProvider: string | null;
  model: string | null;
  /** Demo AI output or a test (mock) payment: never counted as real business. */
  isDemo: boolean;
}

/**
 * Record a funnel event with the standard, non-identifying properties. Never
 * throws (analytics must not break the reading or payment flow).
 */
export async function trackFunnelEvent(
  name: FunnelEvent,
  context: FunnelContext,
  extra: Record<string, string | number | boolean> = {},
): Promise<void> {
  await trackServerEvent(name, {
    userId: context.userId,
    readingId: context.readingId,
    properties: {
      reading_id: context.readingId,
      price_inr: EXTENDED_READING_PRICE_INR,
      currency: EXTENDED_READING_CURRENCY,
      ai_provider: context.aiProvider ?? "unknown",
      model: context.model ?? "unknown",
      is_demo: context.isDemo,
      guest: context.userId === null,
      ...extra,
    },
  });
}

/** Load the funnel context for a stored reading. */
export async function funnelContext(
  readingId: string,
  options: { testPayment?: boolean } = {},
): Promise<FunnelContext | null> {
  const reading = await db.reading
    .findUnique({
      where: { id: readingId },
      select: {
        id: true,
        userId: true,
        isDemo: true,
        aiProvider: true,
        analysis: { select: { model: true } },
        interpretation: { select: { model: true } },
      },
    })
    .catch(() => null);
  if (!reading) return null;
  return {
    readingId: reading.id,
    userId: reading.userId,
    aiProvider: reading.aiProvider,
    model: reading.interpretation?.model ?? reading.analysis?.model ?? null,
    isDemo: reading.isDemo || Boolean(options.testPayment),
  };
}
