import "server-only";
import type { Actor } from "@/lib/auth/actor";
import { getEnv } from "@/lib/config/env";
import { db } from "@/lib/db";
import { AppError } from "@/lib/http/errors";

/**
 * Rewarded ads only: a visitor may CHOOSE to watch one short ad for one extra
 * free palm reading a day. Ads are never forced, never on paid pages and never
 * next to a paid offer.
 *  - "off": no ad option at all (default in production).
 *  - "test": a clearly-labelled 15-second test ad, for development and QA.
 *  - "gam": a Google Ad Manager rewarded ad (needs GAM_REWARDED_AD_UNIT).
 */
export type AdMode = "off" | "test" | "gam";

export function adMode(): AdMode {
  const env = getEnv();
  const mode = env.ADS_MODE === "placeholder" ? "test" : env.ADS_MODE;
  if (mode === "gam") return env.GAM_REWARDED_AD_UNIT ? "gam" : "off";
  return mode ?? (env.NODE_ENV === "development" ? "test" : "off");
}

export function rewardedAdUnit(): string | null {
  return adMode() === "gam" ? (getEnv().GAM_REWARDED_AD_UNIT ?? null) : null;
}

/** Extra free palm readings a watched ad gives, at most once per day. */
export const AD_BONUS_READINGS = 1;
const DAY_MS = 24 * 60 * 60_000;

type Owner = { userId: string | null; guestKeyHash: string | null };

function ownerWhere(owner: Owner) {
  return owner.userId ? { userId: owner.userId } : { guestKeyHash: owner.guestKeyHash };
}

/** Whether this device/account already used today's ad bonus. */
export async function adBonusUsedToday(owner: Owner): Promise<boolean> {
  if (!owner.userId && !owner.guestKeyHash) return true;
  const count = await db.adReward.count({
    where: {
      purpose: "palm",
      createdAt: { gt: new Date(Date.now() - DAY_MS) },
      ...ownerWhere(owner),
    },
  });
  return count > 0;
}

/** Record a watched ad (once per day). */
export async function grantAdReward(actor: Actor): Promise<void> {
  if (adMode() === "off") throw new AppError("NOT_FOUND");
  const owner = { userId: actor.user?.id ?? null, guestKeyHash: actor.guestKeyHash };
  if (!owner.userId && !owner.guestKeyHash) throw new AppError("UNAUTHORIZED");
  if (await adBonusUsedToday(owner)) {
    throw new AppError("CONFLICT", {
      message: "You've already used today's extra reading. Come back tomorrow.",
    });
  }
  await db.adReward.create({ data: { ...owner, purpose: "palm" } });
}
