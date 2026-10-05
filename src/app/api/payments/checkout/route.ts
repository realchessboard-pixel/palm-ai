import { NextResponse, type NextRequest } from "next/server";
import { getActorFromRequest } from "@/lib/auth/actor";
import { withErrorHandling } from "@/lib/http/errors";
import { parseJsonBody } from "@/lib/http/request";
import { startCheckout } from "@/lib/payments/service";
import { ReadingIdBody } from "@/lib/schemas/api";
import { clientIp, enforceRateLimit } from "@/lib/security/rate-limit";

export const POST = withErrorHandling("payments.checkout", async (request: NextRequest) => {
  const actor = await getActorFromRequest(request);
  await enforceRateLimit(
    "checkout",
    actor.user ? `user:${actor.user.id}` : `ip:${clientIp(request)}`,
  );
  const { readingId } = await parseJsonBody(request, ReadingIdBody);
  return NextResponse.json(await startCheckout(readingId, actor));
});
