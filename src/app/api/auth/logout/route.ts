import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/cookies";
import { deleteSessionByToken } from "@/lib/auth/session";
import { withErrorHandling } from "@/lib/http/errors";

export const POST = withErrorHandling("auth.logout", async (request: NextRequest) => {
  await deleteSessionByToken(request.cookies.get(SESSION_COOKIE)?.value);
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
});
