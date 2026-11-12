import "server-only";
import { getEnv } from "@/lib/config/env";

/**
 * Display ads (Google AdSense) on every page, free and paid:
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
