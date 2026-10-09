import { NextResponse, type NextRequest } from "next/server";
import { getActorFromRequest } from "@/lib/auth/actor";
import { withErrorHandling } from "@/lib/http/errors";
import { grantAdReward } from "@/lib/monetization/ads";
import { clientIp, enforceRateLimit } from "@/lib/security/rate-limit";

/** Called after a visitor chose to watch a rewarded ad to the end: one extra free palm reading today. */
export const POST = withErrorHandling("ads.reward", async (request: NextRequest) => {
  await enforceRateLimit("general", `ip:${clientIp(request)}`);
  await grantAdReward(await getActorFromRequest(request));
  return NextResponse.json({ granted: true });
});
