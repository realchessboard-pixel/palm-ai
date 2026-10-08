export type PaymentProviderName = "STRIPE" | "RAZORPAY" | "MOCK";

export interface CheckoutInput {
  paymentId: string;
  /** Set for reading purchases (sent to the provider as metadata). */
  readingId?: string;
  amount: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  description: string;
}

/** What the browser needs to continue checkout. */
export type CheckoutSession =
  | { type: "redirect"; url: string; providerRef: string }
  | {
      type: "razorpay";
      providerRef: string;
      orderId: string;
      keyId: string;
      amount: number;
      currency: string;
    }
  | { type: "completed"; providerRef: string };

export interface WebhookEvent {
  /** Provider event id, used for idempotency. */
  id: string;
  kind: "payment_succeeded" | "payment_failed" | "ignored";
  providerRef?: string;
  providerPaymentId?: string;
  amount?: number;
  currency?: string;
}

/** Payment providers implement this; nothing else in the app knows vendor details. */
export interface PaymentProvider {
  readonly name: PaymentProviderName;
  createCheckout(input: CheckoutInput): Promise<CheckoutSession>;
  /** Verify the signature and normalise the event. Throws on an invalid signature. */
  parseWebhook(rawBody: string, headers: Headers): WebhookEvent;
}

export class WebhookSignatureError extends Error {
  constructor(message = "Invalid webhook signature") {
    super(message);
    this.name = "WebhookSignatureError";
  }
}
