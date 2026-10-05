import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { claimGuestReadings } from "@/lib/readings/service";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, cookieOptions } from "./cookies";
import { getActorFromRequest } from "./actor";
import { createSession, type SessionUser } from "./session";

/** Start a session for `user`, adopt this browser's guest readings, and set the cookie. */
export async function signedInResponse(request: NextRequest, user: SessionUser, status = 200) {
  const { guestKeyHash } = await getActorFromRequest(request);
  await claimGuestReadings(user.id, guestKeyHash);
  const { token } = await createSession(user.id);
  const response = NextResponse.json(
    { user: { email: user.email, name: user.name, isAdmin: user.isAdmin } },
    { status },
  );
  response.cookies.set(SESSION_COOKIE, token, cookieOptions(SESSION_MAX_AGE_SECONDS));
  return response;
}
