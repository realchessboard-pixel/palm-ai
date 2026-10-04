import { NextResponse, type NextRequest } from "next/server";
import { trackServerEvent } from "@/lib/analytics/server";
import { AnalyticsEventSchema, type AnalyticsEventName } from "@/lib/analytics/events";
import { getActorFromRequest } from "@/lib/auth/actor";
import { withErrorHandling } from "@/lib/http/errors";
import { parseJsonBody } from "@/lib/http/request";
import { funnelContext, trackFunnelEvent } from "@/lib/monetization/funnel";
import { getOwnedReading } from "@/lib/readings/service";
import { IdSchema } from "@/lib/schemas/api";
import { clientIp, enforceRateLimit } from "@/lib/security/rate-limit";

/**
 * Only UX events may come from the browser. Outcome events (analysis results,
 * purchases) are recorded server-side and can't be spoofed through here.
 */
const CLIENT_EVENTS = new Set<AnalyticsEventName>([
  "landing_page_view",
  "start_reading",
  "image_uploaded",
  "image_rejected",
  "reading_viewed",
  "premium_clicked",
  "checkout_started",
  "report_downloaded",
  "extended_offer_viewed",
]);

/** Funnel events tied to a reading: ownership is checked and properties are set server-side. */
const READING_EVENTS = new Set<AnalyticsEventName>(["extended_offer_viewed"]);

const ClientEventSchema = AnalyticsEventSchema.extend({ readingId: IdSchema.optional() })
  .refine((e) => CLIENT_EVENTS.has(e.name), { message: "Event not accepted from clients" })
  .refine((e) => !READING_EVENTS.has(e.name) || e.readingId, { message: "readingId is required" });

export const POST = withErrorHandling("events.track", async (request: NextRequest) => {
  await enforceRateLimit("events", clientIp(request));
  const event = await parseJsonBody(request, ClientEventSchema);
  const actor = await getActorFromRequest(request);
  if (event.name === "extended_offer_viewed") {
    const reading = await getOwnedReading(event.readingId!, actor);
    const context = await funnelContext(reading.id);
    if (context) await trackFunnelEvent(event.name, context);
    return new NextResponse(null, { status: 204 });
  }
  await trackServerEvent(event.name, {
    userId: actor.user?.id ?? null,
    properties: event.properties,
  });
  return new NextResponse(null, { status: 204 });
});
