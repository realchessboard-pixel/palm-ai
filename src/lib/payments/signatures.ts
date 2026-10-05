import { createHmac, timingSafeEqual } from "node:crypto";
import { WebhookSignatureError } from "./types";

export function hmacSha256Hex(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  if (!/^[a-f0-9]+$/i.test(a) || !/^[a-f0-9]+$/i.test(b) || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

export const STRIPE_TOLERANCE_SECONDS = 300;

/**
 * Verify a `Stripe-Signature` header (t=timestamp,v1=signature,...) as
 * documented by Stripe: HMAC-SHA256 of `${t}.${rawBody}` with the endpoint
 * secret, plus a timestamp tolerance to prevent replay.
 */
export function verifyStripeSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): void {
  if (!header) throw new WebhookSignatureError("Missing Stripe-Signature header");
  const parts = header.split(",").map((p) => p.trim().split("="));
  const timestamp = Number(parts.find(([k]) => k === "t")?.[1]);
  const signatures = parts.filter(([k]) => k === "v1").map(([, v]) => v ?? "");
  if (!Number.isFinite(timestamp) || signatures.length === 0) {
    throw new WebhookSignatureError("Malformed Stripe-Signature header");
  }
  if (Math.abs(nowSeconds - timestamp) > STRIPE_TOLERANCE_SECONDS) {
    throw new WebhookSignatureError("Stripe webhook timestamp outside tolerance");
  }
  const expected = hmacSha256Hex(secret, `${timestamp}.${rawBody}`);
  if (!signatures.some((sig) => safeEqualHex(sig, expected))) throw new WebhookSignatureError();
}

/** Razorpay webhooks: HMAC-SHA256 of the raw body with the webhook secret. */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  header: string | null,
  secret: string,
): void {
  if (!header) throw new WebhookSignatureError("Missing X-Razorpay-Signature header");
  if (!safeEqualHex(header, hmacSha256Hex(secret, rawBody))) throw new WebhookSignatureError();
}

/** Razorpay Checkout handler: HMAC-SHA256 of `${orderId}|${paymentId}` with the key secret. */
export function verifyRazorpayPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  keySecret: string,
): boolean {
  return safeEqualHex(signature, hmacSha256Hex(keySecret, `${orderId}|${paymentId}`));
}
