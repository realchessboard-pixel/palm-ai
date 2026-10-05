/**
 * Purchase state of a reading's detailed upgrade, as shown to the customer.
 * Only PAYMENT_SUCCESS (a verified payment, which grants the entitlement)
 * unlocks anything; every other state keeps the detailed reading locked.
 */
export const PAYMENT_STATES = [
  "UNPAID",
  "PAYMENT_INITIATED",
  "PAYMENT_SUCCESS",
  "PAYMENT_FAILED",
  "PAYMENT_CANCELLED",
] as const;
export type PaymentState = (typeof PAYMENT_STATES)[number];
