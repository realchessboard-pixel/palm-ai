import "server-only";
import { AppError } from "@/lib/http/errors";
import { verifyRazorpayPaymentSignature, verifyRazorpayWebhookSignature } from "../signatures";
import type { CheckoutInput, CheckoutSession, PaymentProvider, WebhookEvent } from "../types";

interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
}

/** The subset of a Razorpay payment entity the server checks before unlocking. */
export interface RazorpayPayment {
  id: string;
  order_id: string | null;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  amount: number;
  currency: string;
}

interface RazorpayWebhook {
  event: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string; amount?: number; currency?: string } };
    order?: { entity?: { id?: string; amount?: number; currency?: string } };
  };
}

/** Razorpay Orders + Checkout via the REST API. */
export class RazorpayProvider implements PaymentProvider {
  readonly name = "RAZORPAY" as const;

  constructor(
    private readonly config: { keyId?: string; keySecret?: string; webhookSecret?: string },
  ) {}

  private credentials(): { keyId: string; keySecret: string } {
    if (!this.config.keyId || !this.config.keySecret) {
      throw new AppError("PAYMENT_NOT_CONFIGURED", {
        internal: "RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing",
      });
    }
    return { keyId: this.config.keyId, keySecret: this.config.keySecret };
  }

  private authHeader(): string {
    const { keyId, keySecret } = this.credentials();
    return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
  }

  /** Look a payment up server-side (the browser's word is never taken for it). */
  async fetchPayment(paymentId: string): Promise<RazorpayPayment> {
    const response = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`,
      { headers: { Authorization: this.authHeader() }, signal: AbortSignal.timeout(15_000) },
    ).catch((error) => {
      throw new AppError("PAYMENT_ERROR", { internal: error });
    });
    if (!response.ok) {
      throw new AppError("PAYMENT_ERROR", { internal: `Razorpay HTTP ${response.status}` });
    }
    return (await response.json()) as RazorpayPayment;
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutSession> {
    const { keyId } = this.credentials();
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: this.authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: input.amount,
        currency: input.currency.toUpperCase(),
        receipt: input.paymentId.slice(0, 40),
        notes: { paymentId: input.paymentId, readingId: input.readingId },
      }),
      signal: AbortSignal.timeout(20_000),
    }).catch((error) => {
      throw new AppError("PAYMENT_ERROR", { internal: error });
    });
    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 500);
      throw new AppError("PAYMENT_ERROR", {
        internal: `Razorpay HTTP ${response.status}: ${detail}`,
      });
    }
    const order = (await response.json()) as RazorpayOrder;
    return {
      type: "razorpay",
      providerRef: order.id,
      orderId: order.id,
      keyId,
      amount: order.amount,
      currency: order.currency,
    };
  }

  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
    return verifyRazorpayPaymentSignature(
      orderId,
      paymentId,
      signature,
      this.credentials().keySecret,
    );
  }

  parseWebhook(rawBody: string, headers: Headers): WebhookEvent {
    if (!this.config.webhookSecret) {
      throw new AppError("PAYMENT_NOT_CONFIGURED", { internal: "RAZORPAY_WEBHOOK_SECRET missing" });
    }
    verifyRazorpayWebhookSignature(
      rawBody,
      headers.get("x-razorpay-signature"),
      this.config.webhookSecret,
    );
    const body = JSON.parse(rawBody) as RazorpayWebhook;
    const payment = body.payload?.payment?.entity;
    const order = body.payload?.order?.entity;
    const id =
      headers.get("x-razorpay-event-id") ??
      `${body.event}:${payment?.id ?? order?.id ?? "unknown"}`;
    const base = {
      id,
      providerRef: payment?.order_id ?? order?.id,
      providerPaymentId: payment?.id,
      amount: payment?.amount ?? order?.amount,
      currency: (payment?.currency ?? order?.currency)?.toLowerCase(),
    };
    switch (body.event) {
      case "payment.captured":
      case "order.paid":
        return { ...base, kind: "payment_succeeded" };
      case "payment.failed":
        return { ...base, kind: "payment_failed" };
      default:
        return { id, kind: "ignored" };
    }
  }
}
