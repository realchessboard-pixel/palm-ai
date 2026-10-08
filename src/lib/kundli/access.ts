import "server-only";
import { canAccessReading, type Actor } from "@/lib/auth/actor";
import { db } from "@/lib/db";
import { AppError } from "@/lib/http/errors";

export async function getOwnedKundli(id: string, actor: Actor) {
  const kundli = await db.kundliProfile.findUnique({ where: { id } });
  if (!kundli || !canAccessReading(actor, kundli)) throw new AppError("NOT_FOUND");
  return kundli;
}

/** Unlocked by a verified payment for this chart, or by an active membership. */
export async function hasKundliAccess(kundli: {
  id: string;
  userId: string | null;
}): Promise<boolean> {
  const [paid, member] = await Promise.all([
    db.payment.count({ where: { kundliId: kundli.id, status: "PAID" } }),
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
