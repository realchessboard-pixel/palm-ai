import { describe, expect, it } from "vitest";
import {
  hmacSha256Hex,
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
  verifyStripeSignature,
} from "@/lib/payments/signatures";
import { WebhookSignatureError } from "@/lib/payments/types";

const secret = "whsec_test_secret";
const body = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });

function stripeHeader(payload: string, t: number, key = secret) {
  return `t=${t},v1=${hmacSha256Hex(key, `${t}.${payload}`)}`;
}

describe("Stripe webhook signature", () => {
  const now = 1_800_000_000;

  it("accepts a valid signature", () => {
    expect(() => verifyStripeSignature(body, stripeHeader(body, now), secret, now)).not.toThrow();
  });

  it("accepts when any of several v1 signatures matches (secret rotation)", () => {
    const header = `t=${now},v1=${"0".repeat(64)},v1=${hmacSha256Hex(secret, `${now}.${body}`)}`;
    expect(() => verifyStripeSignature(body, header, secret, now)).not.toThrow();
  });

  it.each([
    ["missing header", null],
    ["malformed header", "garbage"],
    ["wrong secret", stripeHeader(body, now, "whsec_other")],
    ["tampered body", stripeHeader(body.replace("evt_1", "evt_2"), now)],
    ["stale timestamp (replay)", stripeHeader(body, now - 301)],
    ["future timestamp", stripeHeader(body, now + 301)],
  ])("rejects %s", (_label, header) => {
    expect(() => verifyStripeSignature(body, header, secret, now)).toThrow(WebhookSignatureError);
  });
});

describe("Razorpay signatures", () => {
  it("verifies webhook bodies", () => {
    const sig = hmacSha256Hex("rzp_webhook_secret", body);
    expect(() => verifyRazorpayWebhookSignature(body, sig, "rzp_webhook_secret")).not.toThrow();
    expect(() => verifyRazorpayWebhookSignature(`${body} `, sig, "rzp_webhook_secret")).toThrow();
    expect(() => verifyRazorpayWebhookSignature(body, null, "rzp_webhook_secret")).toThrow();
    expect(() => verifyRazorpayWebhookSignature(body, "zz", "rzp_webhook_secret")).toThrow();
  });

  it("verifies checkout handler signatures over order_id|payment_id", () => {
    const sig = hmacSha256Hex("key_secret", "order_1|pay_1");
    expect(verifyRazorpayPaymentSignature("order_1", "pay_1", sig, "key_secret")).toBe(true);
    expect(verifyRazorpayPaymentSignature("order_1", "pay_2", sig, "key_secret")).toBe(false);
    expect(verifyRazorpayPaymentSignature("order_1", "pay_1", sig, "other")).toBe(false);
  });
});
