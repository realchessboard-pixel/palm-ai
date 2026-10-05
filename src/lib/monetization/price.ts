/**
 * Customer price of the detailed (extended) reading. This is the single source
 * of truth for the price — every label, checkout amount and analytics
 * property is derived from it. It is what the customer pays, NOT the AI cost
 * (see economics.ts for that).
 */
export const EXTENDED_READING_PRICE_INR = 35;
export const EXTENDED_READING_CURRENCY = "INR";

/** Amount in minor units (paise), as payment providers expect. */
export const EXTENDED_READING_PRICE_MINOR = EXTENDED_READING_PRICE_INR * 100;

/** Display label, e.g. "₹35" (no decimals for whole-rupee prices). */
export function formatInr(amountInr: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: Number.isInteger(amountInr) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amountInr);
}
