import { NextResponse, type NextRequest } from "next/server";
import { getActorFromRequest } from "@/lib/auth/actor";
import { withErrorHandling } from "@/lib/http/errors";
import { parseJsonBody } from "@/lib/http/request";
import { cancelPendingCheckout } from "@/lib/payments/service";
import { ReadingIdBody } from "@/lib/schemas/api";

/** The customer closed checkout (e.g. dismissed the Razorpay window). */
export const POST = withErrorHandling("payments.cancel", async (request: NextRequest) => {
  const actor = await getActorFromRequest(request);
  const { readingId } = await parseJsonBody(request, ReadingIdBody);
  await cancelPendingCheckout(readingId, actor);
  return NextResponse.json({ ok: true });
});
