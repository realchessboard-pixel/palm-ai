import "server-only";
import type { Prisma } from "@prisma/client";
import { getEnv } from "@/lib/config/env";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { AnalyticsEventName } from "./events";

/**
 * Server-side analytics sink behind a tiny interface. "database" stores
 * events in UsageEvent (powering the admin dashboard); "console" logs them;
 * "none" disables tracking. Swap in PostHog/Plausible etc. here.
 */
export interface TrackInput {
  userId?: string | null;
  readingId?: string | null;
  properties?: Record<string, string | number | boolean>;
}

export async function trackServerEvent(
  name: AnalyticsEventName,
  input: TrackInput = {},
): Promise<void> {
  try {
    const provider = getEnv().ANALYTICS_PROVIDER;
    if (provider === "none") return;
    if (provider === "console") {
      logger.info("analytics_event", { name, ...input });
      return;
    }
    await db.usageEvent.create({
      data: {
        name,
        userId: input.userId ?? null,
        readingId: input.readingId ?? null,
        properties: (input.properties ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (error) {
    // Analytics must never break a user flow.
    logger.warn("analytics_failed", { name, error });
  }
}
