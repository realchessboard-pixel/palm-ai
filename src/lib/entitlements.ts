import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Server-side entitlement checks. Premium content is only ever released by
 * the reading projection when `hasPremiumAccess` returns true.
 *
 * A reading is premium if it has an active READING_PREMIUM entitlement, or if
 * its owner has an active PREMIUM_SUBSCRIPTION (architecture for future plans).
 */
export async function hasPremiumAccess(input: {
  readingId: string;
  ownerUserId: string | null;
}): Promise<boolean> {
  const now = new Date();
  const scopes: Prisma.EntitlementWhereInput[] = [
    { type: "READING_PREMIUM", readingId: input.readingId },
  ];
  if (input.ownerUserId) scopes.push({ type: "PREMIUM_SUBSCRIPTION", userId: input.ownerUserId });

  const count = await db.entitlement.count({
    where: {
      revokedAt: null,
      AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }, { OR: scopes }],
    },
  });
  return count > 0;
}

/** Idempotently grant premium access to one reading for a completed payment. */
export async function grantReadingPremium(
  tx: Prisma.TransactionClient,
  input: { readingId: string; userId: string | null; paymentId: string },
): Promise<void> {
  await tx.entitlement.upsert({
    where: { paymentId: input.paymentId },
    create: {
      type: "READING_PREMIUM",
      readingId: input.readingId,
      userId: input.userId,
      paymentId: input.paymentId,
    },
    update: {},
  });
}
