import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getActorFromRequest } from "@/lib/auth/actor";
import { withErrorHandling } from "@/lib/http/errors";
import { parseJsonBody } from "@/lib/http/request";
import { OrderSchema, type Order } from "@/lib/monetization/orders";
import { startOrderCheckout } from "@/lib/payments/service";
import { ReadingIdBody } from "@/lib/schemas/api";

/** Any catalogue order; a bare { readingId } still buys that reading's detailed reading. */
const CheckoutBody = z.union([OrderSchema, ReadingIdBody]);
import { clientIp, enforceRateLimit } from "@/lib/security/rate-limit";

export const POST = withErrorHandling("payments.checkout", async (request: NextRequest) => {
  const actor = await getActorFromRequest(request);
  await enforceRateLimit(
    "checkout",
    actor.user ? `user:${actor.user.id}` : `ip:${clientIp(request)}`,
  );
  const body = await parseJsonBody(request, CheckoutBody);
  const order: Order = "product" in body ? body : { product: "DETAILED_READING", ...body };
  return NextResponse.json(await startOrderCheckout(order, actor));
});
