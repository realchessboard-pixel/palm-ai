import "server-only";
import { db } from "@/lib/db";

export interface AccountBalances {
  walletPaise: number;
  readingCredits: number;
  /** End of the current membership, if any (ISO). */
  membershipUntil: string | null;
}

export interface GiftView {
  code: string;
  redeemed: boolean;
  expiresAt: string;
}

/** What a signed-in user holds: wallet, credits and membership. */
export async function getAccountBalances(userId: string): Promise<AccountBalances> {
  const [user, membership] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true, readingCredits: true },
    }),
    db.entitlement.findFirst({
      where: {
        type: "PREMIUM_SUBSCRIPTION",
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { expiresAt: "desc" },
      select: { expiresAt: true },
    }),
  ]);
  return {
    walletPaise: user?.walletBalance ?? 0,
    readingCredits: user?.readingCredits ?? 0,
    membershipUntil: membership?.expiresAt?.toISOString() ?? null,
  };
}

/** Gift codes this user bought, newest first. */
export async function listGiftsBought(userId: string): Promise<GiftView[]> {
  const gifts = await db.giftCode.findMany({
    where: { purchaserId: userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return gifts.map((g) => ({
    code: g.code,
    redeemed: g.redeemedAt !== null,
    expiresAt: g.expiresAt.toISOString(),
  }));
}
