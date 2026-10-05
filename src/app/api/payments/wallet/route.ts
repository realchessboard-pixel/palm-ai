import { NextResponse, type NextRequest } from "next/server";
import { getActorFromRequest } from "@/lib/auth/actor";
import { withErrorHandling } from "@/lib/http/errors";
import { parseJsonBody } from "@/lib/http/request";
import { OrderSchema } from "@/lib/monetization/orders";
import { payWithWallet } from "@/lib/payments/service";
import { enforceRateLimit } from "@/lib/security/rate-limit";

/** Buy a catalogue product with the signed-in user's PalmAI wallet balance. */
export const POST = withErrorHandling("payments.wallet", async (request: NextRequest) => {
  const actor = await getActorFromRequest(request);
  if (actor.user) await enforceRateLimit("checkout", `user:${actor.user.id}`);
  const order = await parseJsonBody(request, OrderSchema);
  return NextResponse.json(await payWithWallet(order, actor));
});
