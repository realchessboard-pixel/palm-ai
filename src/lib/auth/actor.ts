import "server-only";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import { AppError } from "@/lib/http/errors";
import { GUEST_COOKIE, GUEST_MAX_AGE_SECONDS, SESSION_COOKIE, cookieOptions } from "./cookies";
import { generateToken, sha256 } from "./crypto";
import { getUserBySessionToken, type SessionUser } from "./session";

/**
 * Who is making a request: a signed-in user, an anonymous guest (identified by
 * a random httpOnly cookie), or both (a guest who has since signed in).
 */
export interface Actor {
  user: SessionUser | null;
  guestKeyHash: string | null;
}

function guestHash(token: string | undefined): string | null {
  return token && token.length >= 20 && token.length <= 200 ? sha256(token) : null;
}

export async function getActorFromRequest(request: NextRequest): Promise<Actor> {
  const user = await getUserBySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  return { user, guestKeyHash: guestHash(request.cookies.get(GUEST_COOKIE)?.value) };
}

/** For server components and server actions. */
export async function getActor(): Promise<Actor> {
  const store = await cookies();
  const user = await getUserBySessionToken(store.get(SESSION_COOKIE)?.value);
  return { user, guestKeyHash: guestHash(store.get(GUEST_COOKIE)?.value) };
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  return (await getActor()).user;
}

export function requireUser(actor: Actor): SessionUser {
  if (!actor.user) throw new AppError("UNAUTHORIZED");
  return actor.user;
}

export function requireAdmin(actor: Actor): SessionUser {
  const user = requireUser(actor);
  if (!user.isAdmin) throw new AppError("FORBIDDEN");
  return user;
}

/**
 * Make sure an anonymous visitor has a guest key before creating data they
 * should own. Returns the key hash and a function that sets the cookie on the
 * outgoing response if a new key was issued.
 */
export function ensureGuestKey(
  request: NextRequest,
  actor: Actor,
): { guestKeyHash: string; apply: (response: NextResponse) => NextResponse } {
  if (actor.guestKeyHash) {
    return { guestKeyHash: actor.guestKeyHash, apply: (r) => r };
  }
  const token = generateToken();
  return {
    guestKeyHash: sha256(token),
    apply: (response) => {
      response.cookies.set(GUEST_COOKIE, token, cookieOptions(GUEST_MAX_AGE_SECONDS));
      return response;
    },
  };
}

/** Can this actor access a reading owned by `userId` / `guestKeyHash`? */
export function canAccessReading(
  actor: Actor,
  owner: { userId: string | null; guestKeyHash: string | null },
): boolean {
  if (owner.userId) return actor.user?.id === owner.userId;
  return owner.guestKeyHash !== null && actor.guestKeyHash === owner.guestKeyHash;
}
