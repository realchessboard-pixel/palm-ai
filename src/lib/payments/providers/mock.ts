import { randomUUID } from "node:crypto";
import { AppError } from "@/lib/http/errors";
import type { CheckoutSession, PaymentProvider, WebhookEvent } from "../types";

/**
 * Development/test provider: the "payment" completes immediately with no
 * money involved. The factory refuses it in production unless DEMO_MODE.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "MOCK" as const;

  async createCheckout(): Promise<CheckoutSession> {
    return { type: "completed", providerRef: `mock_${randomUUID()}` };
  }

  parseWebhook(): WebhookEvent {
    throw new AppError("NOT_FOUND");
  }
}
