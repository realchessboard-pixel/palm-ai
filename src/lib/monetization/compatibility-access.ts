import "server-only";
import { canAccessReading, type Actor } from "@/lib/auth/actor";
import { db } from "@/lib/db";
import { AppError } from "@/lib/http/errors";

/** Load a compatibility reading the actor may see (unknown and foreign ones are both NOT_FOUND). */
export async function getOwnedCompatibility(id: string, actor: Actor) {
  const compatibility = await db.compatibility.findUnique({ where: { id } });
  if (!compatibility || !canAccessReading(actor, compatibility)) throw new AppError("NOT_FOUND");
  return compatibility;
}

/** True once a verified payment (or wallet purchase) has unlocked this compatibility reading. */
export async function hasCompatibilityAccess(compatibilityId: string): Promise<boolean> {
  const count = await db.entitlement.count({
    where: { type: "COMPATIBILITY", compatibilityId, revokedAt: null },
  });
  return count > 0;
}
