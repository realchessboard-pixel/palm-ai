import "server-only";
import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { trackServerEvent } from "@/lib/analytics/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { addToLedger } from "@/lib/monetization/orders";

/**
 * Referrals: a visitor shares their link (`/?ref=CODE`). When someone signs up
 * through it and completes their first real reading, the referral qualifies.
 * Every REFERRALS_PER_CREDIT qualified referrals earn the referrer one reading
 * credit, up to MAX_REFERRAL_CREDITS_PER_30_DAYS, so it rewards sharing with
 * friends rather than farming accounts.
 */
export const REFERRALS_PER_CREDIT = 3;
export const MAX_REFERRAL_CREDITS_PER_30_DAYS = 5;

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const REFERRAL_CODE_PATTERN = /^[A-Z2-9]{8}$/;

function newCode(): string {
  return Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

/** The user's referral code, created on first use. */
export async function ensureReferralCode(userId: string): Promise<string> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
  if (user?.referralCode) return user.referralCode;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const updated = await db.user.update({
        where: { id: userId },
        data: { referralCode: newCode() },
        select: { referralCode: true },
      });
      return updated.referralCode!;
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
        throw error;
      }
    }
  }
  throw new Error("Could not allocate a referral code");
}

/** Record who referred a newly registered user (ignored if invalid or self). */
export async function recordReferral(referredId: string, code: string | undefined): Promise<void> {
  if (!code || !REFERRAL_CODE_PATTERN.test(code)) return;
  const referrer = await db.user.findUnique({
    where: { referralCode: code },
    select: { id: true },
  });
  if (!referrer || referrer.id === referredId) return;
  await db.referral.createMany({
    data: [{ referrerId: referrer.id, referredId }],
    skipDuplicates: true,
  });
}

/**
 * Qualify the user's referral once they have a completed, real (non-demo)
 * reading of their own, and reward the referrer. Safe to call repeatedly.
 */
export async function qualifyReferral(userId: string | null): Promise<void> {
  if (!userId) return;
  try {
    const referral = await db.referral.findUnique({ where: { referredId: userId } });
    if (!referral || referral.qualifiedAt) return;
    const reading = await db.reading.findFirst({
      where: { userId, status: "COMPLETE", isDemo: false, role: "SELF" },
      select: { id: true },
    });
    if (!reading) return;
    const claimed = await db.referral.updateMany({
      where: { id: referral.id, qualifiedAt: null },
      data: { qualifiedAt: new Date() },
    });
    if (claimed.count === 0) return;
    await trackServerEvent("referral_qualified", { userId: referral.referrerId });
    await rewardReferrer(referral.referrerId);
  } catch (error) {
    // Rewards are a bonus: never fail a reading because of them.
    logger.error("referral_qualify_failed", { error });
  }
}

async function rewardReferrer(referrerId: string): Promise<void> {
  const qualified = await db.referral.count({
    where: { referrerId, qualifiedAt: { not: null } },
  });
  const earned = Math.floor(qualified / REFERRALS_PER_CREDIT);
  if (earned === 0) return;
  await db.$transaction(async (tx) => {
    const recent = await tx.ledgerEntry.count({
      where: {
        userId: referrerId,
        reason: "referral",
        createdAt: { gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });
    if (recent >= MAX_REFERRAL_CREDITS_PER_30_DAYS) return;
    // One ledger entry per block of qualified referrals: replays can't double-credit.
    await addToLedger(tx, {
      userId: referrerId,
      unit: "READING_CREDIT",
      delta: 1,
      reason: "referral",
      refId: `${referrerId}:block-${earned}`,
    });
  });
}

export interface ReferralSummary {
  code: string;
  qualified: number;
  pending: number;
  creditsEarned: number;
}

export async function getReferralSummary(userId: string): Promise<ReferralSummary> {
  const [code, qualified, pending, creditsEarned] = await Promise.all([
    ensureReferralCode(userId),
    db.referral.count({ where: { referrerId: userId, qualifiedAt: { not: null } } }),
    db.referral.count({ where: { referrerId: userId, qualifiedAt: null } }),
    db.ledgerEntry.count({ where: { userId, reason: "referral" } }),
  ]);
  return { code, qualified, pending, creditsEarned };
}
