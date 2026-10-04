import "server-only";
import { getEnv } from "@/lib/config/env";
import {
  EXTENDED_READING_CURRENCY,
  EXTENDED_READING_PRICE_INR,
  EXTENDED_READING_PRICE_MINOR,
  formatInr,
} from "@/lib/monetization/price";

export interface Price {
  /** Minor units (paise). */
  amount: number;
  /** Lower-case ISO currency, as stored on payments. */
  currency: string;
  label: string;
}

/** The detailed-reading price, derived from the central config. */
export function extendedReadingPrice(): Price {
  return {
    amount: EXTENDED_READING_PRICE_MINOR,
    currency: EXTENDED_READING_CURRENCY.toLowerCase(),
    label: formatInr(EXTENDED_READING_PRICE_INR),
  };
}

/** Whether a purchase can be started. The mock provider is unavailable in production unless DEMO_MODE. */
export function paymentsEnabled(): boolean {
  const env = getEnv();
  if (env.PAYMENT_PROVIDER === "none") return false;
  if (env.PAYMENT_PROVIDER === "mock" && env.NODE_ENV === "production" && !env.DEMO_MODE)
    return false;
  return true;
}
