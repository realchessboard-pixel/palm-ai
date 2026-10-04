import "server-only";
import type { Role } from "@prisma/client";
import { adminEmails } from "@/lib/config/env";
import { db } from "@/lib/db";
import { SESSION_MAX_AGE_SECONDS } from "./cookies";
import { generateToken, sha256 } from "./crypto";

/**
 * Database-backed sessions. Only a SHA-256 of the token is stored, so a
 * database leak doesn't expose usable session cookies.
 *
 * This module is the single seam to replace when moving to Auth.js or
 * Supabase Auth: the rest of the app only uses `SessionUser` and the helpers
 * in ./actor.ts.
 */
export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  isAdmin: boolean;
  trainingOptIn: boolean;
}

const TOUCH_INTERVAL_MS = 60 * 60 * 1000;

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  await db.session.create({ data: { tokenHash: sha256(token), userId, expiresAt } });
  return { token, expiresAt };
}

export function toSessionUser(user: {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  trainingOptIn: boolean;
}): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    trainingOptIn: user.trainingOptIn,
    isAdmin: user.role === "ADMIN" || adminEmails().includes(user.email.toLowerCase()),
  };
}

export async function getUserBySessionToken(
  token: string | undefined | null,
): Promise<SessionUser | null> {
  if (!token || token.length < 20 || token.length > 200) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  if (Date.now() - session.lastUsedAt.getTime() > TOUCH_INTERVAL_MS) {
    await db.session
      .update({ where: { id: session.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);
  }
  return toSessionUser(session.user);
}

export async function deleteSessionByToken(token: string | undefined | null): Promise<void> {
  if (!token) return;
  await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
}

export async function deleteAllSessionsForUser(userId: string): Promise<void> {
  await db.session.deleteMany({ where: { userId } });
}
