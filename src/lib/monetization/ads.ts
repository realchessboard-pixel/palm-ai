import "server-only";
import type { AdMode } from "@/components/ads/ad-slot";
import { getEnv } from "@/lib/config/env";

/** Placeholders only in development unless configured; real ads are not integrated. */
export function adMode(): AdMode {
  const env = getEnv();
  return env.ADS_MODE ?? (env.NODE_ENV === "development" ? "placeholder" : "off");
}
