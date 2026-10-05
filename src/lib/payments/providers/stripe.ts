import "server-only";
import { AppError } from "@/lib/http/errors";
import { verifyStripeSignature } from "../signatures";
import type { CheckoutInput, CheckoutSession, PaymentProvider, WebhookEvent } from "../types";

const API = "https://api.stripe.com/v1";

interface StripeCheckoutSession {
  id: string;
  url?: string | null;
  payment_status?: string;
  payment_intent?: string | null;
  amount_total?: number | null;
  currency?: string | null;
}

/** Stripe Checkout via the REST API (no SDK needed). */
export class StripeProvider implements PaymentProvider {
  readonly name = "STRIPE" as const;

  constructor(private readonly config: { secretKey?: string; webhookSecret?: string }) {}

  private key(): string {
    if (!this.config.secretKey)
      throw new AppError("PAYMENT_NOT_CONFIGURED", { internal: "STRIPE_SECRET_KEY missing" });
    return this.config.secretKey;
  }

  private async request<T>(
    path: string,
    init: { method: string; form?: URLSearchParams; idempotencyKey?: string },
  ) {
    const response = await fetch(`${API}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${this.key()}`,
        ...(init.form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
        ...(init.idempotencyKey ? { "Idempotency-Key": init.idempotencyKey } : {}),
      },
      body: init.form?.toString(),
      signal: AbortSignal.timeout(20_000),
    }).catch((error) => {
      throw new AppError("PAYMENT_ERROR", { internal: error });
    });
    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 500);
      throw new AppError("PAYMENT_ERROR", {
        internal: `Stripe HTTP ${response.status}: ${detail}`,
      });
    }
    return (await response.json()) as T;
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutSession> {
    const form = new URLSearchParams({
      mode: "payment",
      success_url: `${input.successUrl}${input.successUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: input.cancelUrl,
      client_reference_id: input.paymentId,
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": input.currency,
      "line_items[0][price_data][unit_amount]": String(input.amount),
      "line_items[0][price_data][product_data][name]": input.description,
      "metadata[paymentId]": input.paymentId,
      ...(input.readingId ? { "metadata[readingId]": input.readingId } : {}),
    });
    if (input.customerEmail) form.set("customer_email", input.customerEmail);
    const session = await this.request<StripeCheckoutSession>("/checkout/sessions", {
      method: "POST",
      form,
      idempotencyKey: `checkout-${input.paymentId}`,
    });
    if (!session.url)
      throw new AppError("PAYMENT_ERROR", { internal: "Stripe session without URL" });
    return { type: "redirect", url: session.url, providerRef: session.id };
  }

  /** Server-side confirmation used on the success redirect (webhooks remain the source of truth). */
  async retrieveSession(sessionId: string): Promise<StripeCheckoutSession> {
    if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) throw new AppError("VALIDATION_ERROR");
    return this.request<StripeCheckoutSession>(`/checkout/sessions/${sessionId}`, {
      method: "GET",
    });
  }

  parseWebhook(rawBody: string, headers: Headers): WebhookEvent {
    if (!this.config.webhookSecret) {
      throw new AppError("PAYMENT_NOT_CONFIGURED", { internal: "STRIPE_WEBHOOK_SECRET missing" });
    }
    verifyStripeSignature(rawBody, headers.get("stripe-signature"), this.config.webhookSecret);
    const event = JSON.parse(rawBody) as {
      id: string;
      type: string;
      data?: { object?: StripeCheckoutSession };
    };
    const session = event.data?.object;
    const base = {
      id: event.id,
      providerRef: session?.id,
      providerPaymentId: session?.payment_intent ?? undefined,
      amount: session?.amount_total ?? undefined,
      currency: session?.currency ?? undefined,
    };
    switch (event.type) {
      case "checkout.session.completed":
        return {
          ...base,
          kind: session?.payment_status === "paid" ? "payment_succeeded" : "ignored",
        };
      case "checkout.session.async_payment_succeeded":
        return { ...base, kind: "payment_succeeded" };
      case "checkout.session.async_payment_failed":
      case "checkout.session.expired":
        return { ...base, kind: "payment_failed" };
      default:
        return { id: event.id, kind: "ignored" };
    }
  }
}
