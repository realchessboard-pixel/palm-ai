/**
 * The product catalogue: the single source of truth for every customer price.
 * Labels, checkout amounts, analytics and the admin economics all derive from
 * here. These are what customers pay — NOT the AI cost (see economics.ts).
 *
 * Price points follow common Indian pricing (₹49 / ₹99 / ₹149 / ₹299) and are
 * shown honestly: no fake "original" prices, countdowns or scarcity claims.
 */
export const PRODUCT_KINDS = [
  "DETAILED_READING",
  "COUPLE_COMPATIBILITY",
  "FAMILY_PACK",
  "GIFT_READING",
  "MEMBERSHIP_YEAR",
  "KUNDLI_REPORT",
] as const;
export type CatalogProduct = (typeof PRODUCT_KINDS)[number];

export interface ProductInfo {
  priceInr: number;
  name: string;
  description: string;
  /** Account products need a signed-in user (balances, codes and memberships live on the account). */
  requiresAccount: boolean;
}

export const PRODUCTS: Record<CatalogProduct, ProductInfo> = {
  KUNDLI_REPORT: {
    priceInr: 99,
    name: "Full Kundli reading",
    description:
      "A personal written reading of your birth chart: Lagna and Moon nature, mind, career, relationships, strengths and your current dasha.",
    requiresAccount: false,
  },
  DETAILED_READING: {
    priceInr: 49,
    name: "Detailed palm reading",
    description:
      "Every section in depth, all major lines, the parvats, fingers and thumb, markings, and a PDF.",
    requiresAccount: false,
  },
  COUPLE_COMPATIBILITY: {
    priceInr: 99,
    name: "Couple compatibility reading",
    description:
      "Your palm and your partner's, read together: how you think, care and grow as a pair.",
    requiresAccount: false,
  },
  FAMILY_PACK: {
    priceInr: 149,
    name: "Family pack — 4 detailed readings",
    description: "Four detailed-reading credits for you and your family. Never expire.",
    requiresAccount: true,
  },
  GIFT_READING: {
    priceInr: 49,
    name: "Gift a detailed reading",
    description: "A gift code to share on WhatsApp — perfect for birthdays, Diwali and Rakhi.",
    requiresAccount: true,
  },
  MEMBERSHIP_YEAR: {
    priceInr: 299,
    name: "PalmAI membership — 1 year",
    description:
      "For a year, every palm reading includes the detailed reading and PDF, and every Kundli includes the full Kundli reading.",
    requiresAccount: true,
  },
};

/** Detailed-reading credits a family pack adds. */
export const FAMILY_PACK_CREDITS = 4;
export const MEMBERSHIP_DAYS = 365;
/** Gift codes stay redeemable for a year. */
export const GIFT_VALID_DAYS = 365;

/**
 * Wallet top-ups with a bonus. The wallet is closed-loop: spendable only on
 * PalmAI, not refundable as cash and not transferable.
 */
export const WALLET_TOPUPS = [
  { payInr: 100, creditInr: 110 },
  { payInr: 250, creditInr: 280 },
  { payInr: 500, creditInr: 575 },
] as const;
export type WalletTopup = (typeof WALLET_TOPUPS)[number];

export function walletTopup(payInr: number): WalletTopup | null {
  return WALLET_TOPUPS.find((t) => t.payInr === payInr) ?? null;
}

/**
 * "Ask a Reader": each AI reader belongs to a tier. A single question, or a
 * bundle (a short consultation) at a lower price per question.
 */
export const READER_TIERS = {
  quick: { singleInr: 39, bundle: { questions: 3, priceInr: 99 } },
  standard: { singleInr: 49, bundle: { questions: 3, priceInr: 129 } },
  senior: { singleInr: 79, bundle: { questions: 8, priceInr: 150 } },
  master: { singleInr: 99, bundle: { questions: 10, priceInr: 200 } },
} as const;
export type ReaderTier = keyof typeof READER_TIERS;
export type ReaderPlan = "single" | "bundle";

export function readerPlan(tier: ReaderTier, plan: ReaderPlan) {
  const t = READER_TIERS[tier];
  return plan === "single"
    ? { questions: 1, priceInr: t.singleInr }
    : { questions: t.bundle.questions, priceInr: t.bundle.priceInr };
}

// Kept for existing callers: the detailed reading is the main upsell.
export const EXTENDED_READING_PRICE_INR = PRODUCTS.DETAILED_READING.priceInr;
export const EXTENDED_READING_CURRENCY = "INR";

/** Amount in minor units (paise), as payment providers expect. */
export const EXTENDED_READING_PRICE_MINOR = EXTENDED_READING_PRICE_INR * 100;

export const toPaise = (inr: number) => Math.round(inr * 100);

/** Display label, e.g. "₹49" (no decimals for whole-rupee prices). */
export function formatInr(amountInr: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: Number.isInteger(amountInr) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amountInr);
}
