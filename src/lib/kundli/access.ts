import "server-only";
import { canAccessReading, type Actor } from "@/lib/auth/actor";
import { db } from "@/lib/db";
import { AppError } from "@/lib/http/errors";

export async function getOwnedKundli(id: string, actor: Actor) {
  const kundli = await db.kundliProfile.findUnique({ where: { id } });
  if (!kundli || !canAccessReading(actor, kundli)) throw new AppError("NOT_FOUND");
  return kundli;
}

export async function getOwnedMilan(id: string, actor: Actor) {
  const milan = await db.milanProfile.findUnique({ where: { id } });
  if (!milan || !canAccessReading(actor, milan)) throw new AppError("NOT_FOUND");
  return milan;
}

async function isMember(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  return (
    (await db.entitlement.count({
      where: {
        type: "PREMIUM_SUBSCRIPTION",
        userId,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    })) > 0
  );
}

/** Detailed Milan: unlocked by a verified payment for it, or by an active membership. */
export async function hasMilanAccess(milan: { id: string; userId: string | null }) {
  const paid = await db.payment.count({ where: { milanId: milan.id, status: "PAID" } });
  return paid > 0 || isMember(milan.userId);
}

/**
 * Unlocked by a verified payment for THIS product on this chart (a cheaper
 * product on the same chart never unlocks another), or by an active membership.
 */
export async function hasKundliAccess(
  kundli: { id: string; userId: string | null },
  product: "KUNDLI_REPORT" | "RASHIFAL_REPORT" = "KUNDLI_REPORT",
): Promise<boolean> {
  const [paid, member] = await Promise.all([
    db.payment.count({ where: { kundliId: kundli.id, status: "PAID", product } }),
    kundli.userId
      ? db.entitlement.count({
          where: {
            type: "PREMIUM_SUBSCRIPTION",
            userId: kundli.userId,
            revokedAt: null,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
        })
      : 0,
  ]);
  return paid + member > 0;
}
