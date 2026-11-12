import "server-only";
import type { Prisma } from "@prisma/client";
import type { Actor } from "@/lib/auth/actor";
import { getEnv } from "@/lib/config/env";
import { db } from "@/lib/db";

/**
 * Display ads (Google AdSense) for visitors who haven't paid (paying visitors see none):
 *  - "on": real AdSense ads (needs NEXT_PUBLIC_ADSENSE_CLIENT) — Auto ads plus
 *    fixed slots at the top, in the middle and above the footer, and a sticky
 *    bar on phones.
 *  - "test": grey labelled boxes in the same places, to review the layout.
 *  - "off": no display ads.
 * Default: "on" when a publisher id is set, otherwise off ("test" in development).
 */
export type DisplayAds =
  | { mode: "off" }
  | { mode: "test" }
  | {
      mode: "on";
      client: string;
      slots: { top?: string; inline?: string; bottom?: string };
    };

export function displayAds(): DisplayAds {
  const env = getEnv();
  const wanted = env.DISPLAY_ADS ?? (env.NEXT_PUBLIC_ADSENSE_CLIENT ? "on" : "off");
  if (wanted === "off") return { mode: "off" };
  if (wanted === "test") return { mode: "test" };
  if (!env.NEXT_PUBLIC_ADSENSE_CLIENT) return { mode: "off" };
  return {
    mode: "on",
    client: env.NEXT_PUBLIC_ADSENSE_CLIENT,
    slots: {
      top: env.NEXT_PUBLIC_ADSENSE_SLOT_TOP,
      inline: env.NEXT_PUBLIC_ADSENSE_SLOT_INLINE,
      bottom: env.NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM,
    },
  };
}

/**
 * Anyone who has ever paid — any product, as a guest or signed in — or holds
 * credits, a gift unlock or membership never sees display ads, on any page.
 */
export async function isPayingVisitor(actor: Actor): Promise<boolean> {
  const userId = actor.user?.id ?? null;
  const guest = actor.guestKeyHash;
  if (!userId && !guest) return false;
  const or: Prisma.PaymentWhereInput[] = [];
  if (userId) or.push({ userId });
  if (guest) {
    or.push(
      { reading: { guestKeyHash: guest } },
      { kundli: { guestKeyHash: guest } },
      { milan: { guestKeyHash: guest } },
      { readerChat: { guestKeyHash: guest } },
    );
  }
  const [payments, entitlements, user] = await Promise.all([
    db.payment.count({ where: { status: "PAID", OR: or }, take: 1 }),
    userId
      ? db.entitlement.count({ where: { userId, revokedAt: null }, take: 1 })
      : Promise.resolve(0),
    userId
      ? db.user.findUnique({ where: { id: userId }, select: { readingCredits: true } })
      : Promise.resolve(null),
  ]);
  return payments > 0 || entitlements > 0 || (user?.readingCredits ?? 0) > 0;
}
