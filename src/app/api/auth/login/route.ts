import type { NextRequest } from "next/server";
import { authenticate } from "@/lib/auth/accounts";
import { signedInResponse } from "@/lib/auth/respond";
import { withErrorHandling } from "@/lib/http/errors";
import { parseJsonBody } from "@/lib/http/request";
import { LoginSchema } from "@/lib/schemas/api";
import { clientIp, enforceRateLimit } from "@/lib/security/rate-limit";

export const POST = withErrorHandling("auth.login", async (request: NextRequest) => {
  await enforceRateLimit("auth", `ip:${clientIp(request)}`);
  const { email, password } = await parseJsonBody(request, LoginSchema);
  await enforceRateLimit("auth", `email:${email}`);
  const user = await authenticate(email, password);
  return signedInResponse(request, user);
});
