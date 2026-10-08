import type { NextRequest } from "next/server";
import { registerUser } from "@/lib/auth/accounts";
import { signedInResponse } from "@/lib/auth/respond";
import { qualifyReferral, recordReferral } from "@/lib/growth/referrals";
import { withErrorHandling } from "@/lib/http/errors";
import { parseJsonBody } from "@/lib/http/request";
import { SignupSchema } from "@/lib/schemas/api";
import { clientIp, enforceRateLimit } from "@/lib/security/rate-limit";

export const POST = withErrorHandling("auth.signup", async (request: NextRequest) => {
  await enforceRateLimit("auth", `ip:${clientIp(request)}`);
  const input = await parseJsonBody(request, SignupSchema);
  const user = await registerUser(input);
  await recordReferral(user.id, input.ref);
  const response = await signedInResponse(request, user, 201);
  // A guest reading adopted at signup can qualify the referral straight away.
  await qualifyReferral(user.id);
  return response;
});
