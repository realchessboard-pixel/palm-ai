import "server-only";
import { getEnv } from "@/lib/config/env";

export interface Price {
  /** Minor units (e.g. cents / paise). */
  amount: number;
  currency: string;
  label: string;
}

export function premiumPrice(): Price {
  const env = getEnv();
  const currency = env.PREMIUM_PRICE_CURRENCY;
  const formatter = new Intl.NumberFormat("en", {
    style: "currency",
    currency: currency.toUpperCase(),
  });
  const digits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
  return {
    amount: env.PREMIUM_PRICE_AMOUNT,
    currency,
    label: formatter.format(env.PREMIUM_PRICE_AMOUNT / 10 ** digits),
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
