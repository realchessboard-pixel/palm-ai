import "server-only";
import { getEnv } from "@/lib/config/env";
import { EXTENDED_READING_PRICE_INR } from "./price";

/**
 * INTERNAL unit economics. Costs here are estimates for analytics only — they
 * never drive pricing or access, and are never sent to the browser except to
 * admins.
 *
 * Unknowns (payment fees, ad revenue) are not assumed: while unset they are
 * reported as `null` and listed in `missing`, and the contribution excludes them.
 */
export interface EconomicsInputs {
  /** Users who started a reading. */
  users: number;
  /** Completed basic (free) readings — each costs one AI pipeline run. */
  basicReadings: number;
  /** Verified, real (non-test) detailed-reading purchases. */
  extendedPurchases: number;
}

export interface EconomicsAssumptions {
  priceInr: number;
  basicAiCostInr: number;
  extendedAiCostInr: number;
  paymentFeePercent: number | null;
  paymentFeeFixedInr: number | null;
  adRevenuePer1000BasicReadingsInr: number | null;
}

export interface Economics {
  inputs: EconomicsInputs;
  assumptions: EconomicsAssumptions;
  /** Extended purchases / basic readings, 0–1. */
  conversionRate: number;
  totals: Money;
  per1000Users: Money;
  /** Assumptions that are not configured yet (excluded from the contribution). */
  missing: ("payment_fees" | "ad_revenue")[];
}

interface Money {
  revenueInr: number;
  aiCostInr: number;
  paymentFeesInr: number | null;
  adRevenueInr: number | null;
  grossContributionInr: number;
}

export function economicsAssumptions(): EconomicsAssumptions {
  const env = getEnv();
  return {
    priceInr: EXTENDED_READING_PRICE_INR,
    basicAiCostInr: env.ESTIMATED_BASIC_AI_COST_INR,
    extendedAiCostInr: env.ESTIMATED_EXTENDED_AI_COST_INR,
    paymentFeePercent: env.PAYMENT_FEE_PERCENT ?? null,
    paymentFeeFixedInr: env.PAYMENT_FEE_FIXED_INR ?? null,
    adRevenuePer1000BasicReadingsInr: env.AD_REVENUE_PER_1000_READINGS_INR ?? null,
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeEconomics(
  inputs: EconomicsInputs,
  assumptions: EconomicsAssumptions = economicsAssumptions(),
): Economics {
  const a = assumptions;
  const revenue = inputs.extendedPurchases * a.priceInr;
  const aiCost =
    inputs.basicReadings * a.basicAiCostInr + inputs.extendedPurchases * a.extendedAiCostInr;
  const feesKnown = a.paymentFeePercent !== null || a.paymentFeeFixedInr !== null;
  const fees = feesKnown
    ? inputs.extendedPurchases *
      ((a.priceInr * (a.paymentFeePercent ?? 0)) / 100 + (a.paymentFeeFixedInr ?? 0))
    : null;
  const ads =
    a.adRevenuePer1000BasicReadingsInr === null
      ? null
      : (inputs.basicReadings / 1000) * a.adRevenuePer1000BasicReadingsInr;

  const totals: Money = {
    revenueInr: round2(revenue),
    aiCostInr: round2(aiCost),
    paymentFeesInr: fees === null ? null : round2(fees),
    adRevenueInr: ads === null ? null : round2(ads),
    grossContributionInr: round2(revenue + (ads ?? 0) - aiCost - (fees ?? 0)),
  };
  const scale = inputs.users > 0 ? 1000 / inputs.users : 0;
  const scaled = (n: number | null) => (n === null ? null : round2(n * scale));

  return {
    inputs,
    assumptions,
    conversionRate: inputs.basicReadings ? inputs.extendedPurchases / inputs.basicReadings : 0,
    totals,
    per1000Users: {
      revenueInr: scaled(totals.revenueInr)!,
      aiCostInr: scaled(totals.aiCostInr)!,
      paymentFeesInr: scaled(totals.paymentFeesInr),
      adRevenueInr: scaled(totals.adRevenueInr),
      grossContributionInr: scaled(totals.grossContributionInr)!,
    },
    missing: [
      ...(feesKnown ? [] : ["payment_fees" as const]),
      ...(ads === null ? ["ad_revenue" as const] : []),
    ],
  };
}
