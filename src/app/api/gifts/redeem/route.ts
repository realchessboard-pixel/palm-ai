import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getActorFromRequest } from "@/lib/auth/actor";
import { withErrorHandling } from "@/lib/http/errors";
import { parseJsonBody } from "@/lib/http/request";
import { redeemGift } from "@/lib/payments/service";
import { clientIp, enforceRateLimit } from "@/lib/security/rate-limit";

const Body = z.object({ code: z.string().trim().min(5).max(20) });

/** Redeem a gift code into one detailed-reading credit (signed-in users). */
export const POST = withErrorHandling("gifts.redeem", async (request: NextRequest) => {
  // Limit guessing of gift codes.
  await enforceRateLimit("checkout", `ip:${clientIp(request)}`);
  const { code } = await parseJsonBody(request, Body);
  await redeemGift(code, await getActorFromRequest(request));
  return NextResponse.json({ ok: true });
});
