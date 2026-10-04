import { NextResponse, type NextRequest } from "next/server";
import { getActorFromRequest } from "@/lib/auth/actor";
import { withErrorHandling } from "@/lib/http/errors";
import { parseJsonBody } from "@/lib/http/request";
import { completeMockPayment } from "@/lib/payments/service";
import { MockPaymentOutcomeSchema } from "@/lib/schemas/api";

const RETURN_STATE = { success: "success", failure: "failed", cancel: "cancelled" } as const;

/** Sandbox checkout result. Refused unless the mock provider is active and allowed. */
export const POST = withErrorHandling("payments.mock.complete", async (request: NextRequest) => {
  const actor = await getActorFromRequest(request);
  const { paymentId, outcome } = await parseJsonBody(request, MockPaymentOutcomeSchema);
  const { readingId } = await completeMockPayment(paymentId, outcome, actor);
  return NextResponse.json({
    readingId,
    redirect: `/readings/${readingId}?checkout=${RETURN_STATE[outcome]}`,
  });
});
