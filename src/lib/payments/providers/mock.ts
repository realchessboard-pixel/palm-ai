import { randomUUID } from "node:crypto";
import { AppError } from "@/lib/http/errors";
import type { CheckoutInput, CheckoutSession, PaymentProvider, WebhookEvent } from "../types";

/**
 * Development/test provider: a sandbox checkout page where the tester chooses
 * success, failure or cancellation. No money is involved, mock payments are
 * flagged as demo in analytics and excluded from revenue, and the factory
 * refuses this provider in production unless DEMO_MODE.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "MOCK" as const;

  async createCheckout(input: CheckoutInput): Promise<CheckoutSession> {
    const origin = new URL(input.successUrl).origin;
    return {
      type: "redirect",
      url: `${origin}/checkout/sandbox/${input.paymentId}`,
      providerRef: `mock_${randomUUID()}`,
    };
  }

  parseWebhook(): WebhookEvent {
    throw new AppError("NOT_FOUND");
  }
}
