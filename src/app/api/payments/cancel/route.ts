import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getActorFromRequest } from "@/lib/auth/actor";
import { withErrorHandling } from "@/lib/http/errors";
import { parseJsonBody } from "@/lib/http/request";
import { cancelPayment, cancelPendingCheckout } from "@/lib/payments/service";
import { IdSchema, ReadingIdBody } from "@/lib/schemas/api";

const CancelBody = z.union([ReadingIdBody, z.object({ paymentId: IdSchema })]);

/** The customer closed checkout (e.g. dismissed the Razorpay window). */
export const POST = withErrorHandling("payments.cancel", async (request: NextRequest) => {
  const actor = await getActorFromRequest(request);
  const body = await parseJsonBody(request, CancelBody);
  if ("paymentId" in body) await cancelPayment(body.paymentId, actor);
  else await cancelPendingCheckout(body.readingId, actor);
  return NextResponse.json({ ok: true });
});
