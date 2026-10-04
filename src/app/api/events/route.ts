import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { trackServerEvent } from "@/lib/analytics/server";
import { AnalyticsEventSchema, type AnalyticsEventName } from "@/lib/analytics/events";
import { getActorFromRequest } from "@/lib/auth/actor";
import { withErrorHandling } from "@/lib/http/errors";
import { parseJsonBody } from "@/lib/http/request";
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
]);

const ClientEventSchema = AnalyticsEventSchema.refine((e) => CLIENT_EVENTS.has(e.name), {
  message: "Event not accepted from clients",
}) as z.ZodType<z.infer<typeof AnalyticsEventSchema>>;

export const POST = withErrorHandling("events.track", async (request: NextRequest) => {
  await enforceRateLimit("events", clientIp(request));
  const event = await parseJsonBody(request, ClientEventSchema);
  const actor = await getActorFromRequest(request);
  await trackServerEvent(event.name, {
    userId: actor.user?.id ?? null,
    properties: event.properties,
  });
  return new NextResponse(null, { status: 204 });
});
