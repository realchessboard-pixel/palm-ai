import "server-only";
import { Prisma } from "@prisma/client";
import { sha256 } from "@/lib/auth/crypto";
import { getEnv } from "@/lib/config/env";
import { db } from "@/lib/db";
import { AppError } from "@/lib/http/errors";

/** Free services that cost us an AI call. Each is given once per identity, ever. */
export type FreeService = "palm" | "mahakundli";

export interface FreeIdentity {
  ip: string | null;
  guestKeyHash: string | null;
  userId: string | null;
}

/**
 * Every identity the visitor has: account, device cookie and IP address. A free
 * service used by any one of them counts as used for all of them. Raw IPs are
 * never stored, only salted hashes.
 */
export function freeKeys(who: FreeIdentity): string[] {
  const env = getEnv();
  const salt = env.CRON_SECRET ?? "astrovidya-free";
  const keys: string[] = [];
  if (who.userId) keys.push(`user:${who.userId}`);
  if (who.guestKeyHash) keys.push(`guest:${who.guestKeyHash}`);
  if (env.FREE_ONCE_BY_IP && who.ip && who.ip !== "unknown") keys.push(`ip:${who.ip}`);
  return keys.map((k) => sha256(`${salt}|${k}`));
}

export async function freeUsed(service: FreeService, who: FreeIdentity): Promise<boolean> {
  const keys = freeKeys(who);
  if (!keys.length) return false;
  return (await db.freeClaim.count({ where: { service, keyHash: { in: keys } } })) > 0;
}

/**
 * Take the visitor's one free use of `service`, or throw FREE_USED. Returns a
 * release function: call it if the free service then fails, so a broken AI
 * call never costs the visitor their free use.
 */
export async function claimFree(
  service: FreeService,
  who: FreeIdentity,
): Promise<() => Promise<void>> {
  const keys = freeKeys(who);
  const noop = async () => undefined;
  if (!keys.length) return noop;
  if (await freeUsed(service, who)) throw freeUsedError(service);
  try {
    await db.freeClaim.createMany({ data: keys.map((keyHash) => ({ service, keyHash })) });
  } catch (error) {
    // Two requests at once: only the first wins.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw freeUsedError(service);
    }
    throw error;
  }
  return async () => {
    await db.freeClaim
      .deleteMany({ where: { service, keyHash: { in: keys } } })
      .catch(() => undefined);
  };
}

function freeUsedError(service: FreeService): AppError {
  return new AppError("RATE_LIMITED", {
    message:
      service === "palm"
        ? "You've already had your free palm reading. Your detailed reading is ready to open — no new photo needed."
        : "You've already had your free Mahakundli answer. Open the full Mahakundli for every area of life.",
    details: { reason: "free_used", service },
  });
}
