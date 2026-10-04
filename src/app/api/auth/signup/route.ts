import type { NextRequest } from "next/server";
import { registerUser } from "@/lib/auth/accounts";
import { signedInResponse } from "@/lib/auth/respond";
import { withErrorHandling } from "@/lib/http/errors";
import { parseJsonBody } from "@/lib/http/request";
import { SignupSchema } from "@/lib/schemas/api";
import { clientIp, enforceRateLimit } from "@/lib/security/rate-limit";

export const POST = withErrorHandling("auth.signup", async (request: NextRequest) => {
  await enforceRateLimit("auth", `ip:${clientIp(request)}`);
  const input = await parseJsonBody(request, SignupSchema);
  const user = await registerUser(input);
  return signedInResponse(request, user, 201);
});
