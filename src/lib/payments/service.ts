import "server-only";
import { Prisma } from "@prisma/client";
import { trackServerEvent } from "@/lib/analytics/server";
import type { Actor } from "@/lib/auth/actor";
import { getEnv } from "@/lib/config/env";
import { siteConfig } from "@/lib/config/site";
import { db } from "@/lib/db";
import { grantReadingPremium, hasPremiumAccess } from "@/lib/entitlements";
import { AppError } from "@/lib/http/errors";
import { logger } from "@/lib/logger";
import { getOwnedReading } from "@/lib/readings/service";
import { getPaymentProvider, getProviderByName, razorpayProvider, stripeProvider } from "./index";
import { premiumPrice } from "./pricing";
import type { CheckoutSession, PaymentProviderName, WebhookEvent } from "./types";
import { WebhookSignatureError } from "./types";

export type CheckoutResponse =
  | { type: "redirect"; url: string }
  | { type: "completed" }
  | {
      type: "razorpay";
      keyId: string;
      orderId: string;
      amount: number;
      currency: string;
      name: string;
      description: string;
    };

const DESCRIPTION = `${siteConfig.name} full palm reading report`;

/** Begin a purchase of the full report for one reading the actor owns. */
export async function startCheckout(readingId: string, actor: Actor): Promise<CheckoutResponse> {
  const reading = await getOwnedReading(readingId, actor);
  if (reading.status !== "COMPLETE") {
    throw new AppError("CONFLICT", { message: "This reading isn't ready yet." });
  }
  if (await hasPremiumAccess({ readingId: reading.id, ownerUserId: reading.userId })) {
    return { type: "completed" };
  }

  const provider = getPaymentProvider();
  const price = premiumPrice();
  const payment = await db.payment.create({
    data: {
      provider: provider.name,
      amount: price.amount,
      currency: price.currency,
      readingId: reading.id,
      userId: reading.userId,
    },
  });

  const base = getEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  let session: CheckoutSession;
  try {
    session = await provider.createCheckout({
      paymentId: payment.id,
      readingId: reading.id,
      amount: price.amount,
      currency: price.currency,
      successUrl: `${base}/readings/${reading.id}?checkout=success`,
      cancelUrl: `${base}/readings/${reading.id}?checkout=cancelled`,
      customerEmail: actor.user?.email,
      description: DESCRIPTION,
    });
  } catch (error) {
    await db.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    throw error instanceof AppError ? error : new AppError("PAYMENT_ERROR", { internal: error });
  }
  await db.payment.update({
    where: { id: payment.id },
    data: { providerRef: session.providerRef },
  });

  switch (session.type) {
    case "completed":
      await fulfillPayment({
        providerRef: session.providerRef,
        amount: price.amount,
        currency: price.currency,
      });
      return { type: "completed" };
    case "redirect":
      return { type: "redirect", url: session.url };
    case "razorpay":
      return {
        type: "razorpay",
        keyId: session.keyId,
        orderId: session.orderId,
        amount: session.amount,
        currency: session.currency,
        name: siteConfig.name,
        description: DESCRIPTION,
      };
  }
}

/**
 * Mark a payment as paid and grant the entitlement. Idempotent: safe to call
 * from webhooks, redirects and client confirmations for the same payment.
 */
export async function fulfillPayment(input: {
  providerRef: string;
  providerPaymentId?: string;
  amount?: number;
  currency?: string;
}): Promise<"fulfilled" | "already_fulfilled" | "unknown_payment" | "mismatch"> {
  const outcome = await db.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { providerRef: input.providerRef } });
    if (!payment) return "unknown_payment" as const;
    if (payment.status === "PAID") return "already_fulfilled" as const;

    const amountMismatch = input.amount !== undefined && input.amount !== payment.amount;
    const currencyMismatch =
      input.currency !== undefined &&
      input.currency.toLowerCase() !== payment.currency.toLowerCase();
    if (amountMismatch || currencyMismatch) {
      await tx.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
      return "mismatch" as const;
    }

    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "PAID", paidAt: new Date(), providerPaymentId: input.providerPaymentId },
    });
    if (payment.readingId) {
      await grantReadingPremium(tx, {
        readingId: payment.readingId,
        userId: payment.userId,
        paymentId: payment.id,
      });
    }
    return "fulfilled" as const;
  });

  if (outcome === "fulfilled") {
    const payment = await db.payment.findUnique({ where: { providerRef: input.providerRef } });
    await trackServerEvent("purchase_completed", {
      userId: payment?.userId,
      readingId: payment?.readingId,
      properties: { provider: payment?.provider ?? "unknown", amount: payment?.amount ?? 0 },
    });
  } else if (outcome !== "already_fulfilled") {
    logger.error("payment_fulfillment_problem", { outcome, providerRef: input.providerRef });
  }
  return outcome;
}

export async function failPayment(providerRef: string): Promise<void> {
  await db.payment.updateMany({
    where: { providerRef, status: "PENDING" },
    data: { status: "FAILED" },
  });
}

/** Verify and apply a provider webhook. Duplicate deliveries are ignored. */
export async function handleWebhook(
  providerName: PaymentProviderName,
  rawBody: string,
  headers: Headers,
): Promise<{ status: "processed" | "duplicate" | "ignored" }> {
  let event: WebhookEvent;
  try {
    event = getProviderByName(providerName).parseWebhook(rawBody, headers);
  } catch (error) {
    if (error instanceof WebhookSignatureError || error instanceof SyntaxError) {
      throw new AppError("VALIDATION_ERROR", { message: "Invalid webhook.", internal: error });
    }
    throw error;
  }

  const seen = await db.processedWebhookEvent.findUnique({
    where: { id: `${providerName}:${event.id}` },
  });
  if (seen) return { status: "duplicate" };

  if (event.kind === "payment_succeeded" && event.providerRef) {
    await fulfillPayment({
      providerRef: event.providerRef,
      providerPaymentId: event.providerPaymentId,
      amount: event.amount,
      currency: event.currency,
    });
  } else if (event.kind === "payment_failed" && event.providerRef) {
    await failPayment(event.providerRef);
  }

  try {
    await db.processedWebhookEvent.create({
      data: { id: `${providerName}:${event.id}`, provider: providerName },
    });
  } catch (error) {
    // A concurrent delivery recorded it first; processing was idempotent anyway.
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"))
      throw error;
  }
  return { status: event.kind === "ignored" ? "ignored" : "processed" };
}

/** Razorpay Checkout success handler: verify the signature, then fulfil. */
export async function confirmRazorpayPayment(
  input: { orderId: string; paymentId: string; signature: string },
  actor: Actor,
): Promise<void> {
  const payment = await db.payment.findUnique({ where: { providerRef: input.orderId } });
  if (!payment || payment.provider !== "RAZORPAY" || !payment.readingId)
    throw new AppError("NOT_FOUND");
  await getOwnedReading(payment.readingId, actor);
  if (!razorpayProvider().verifyPaymentSignature(input.orderId, input.paymentId, input.signature)) {
    throw new AppError("PAYMENT_ERROR", { message: "We couldn't verify this payment." });
  }
  await fulfillPayment({ providerRef: input.orderId, providerPaymentId: input.paymentId });
}

/**
 * On return from Stripe Checkout, confirm the session server-side so the
 * user sees their report immediately even if the webhook is still in flight.
 */
export async function confirmStripeReturn(sessionId: string, readingId: string): Promise<void> {
  try {
    const payment = await db.payment.findUnique({ where: { providerRef: sessionId } });
    if (!payment || payment.readingId !== readingId || payment.status === "PAID") return;
    const session = await stripeProvider().retrieveSession(sessionId);
    if (session.payment_status === "paid") {
      await fulfillPayment({
        providerRef: session.id,
        providerPaymentId: session.payment_intent ?? undefined,
        amount: session.amount_total ?? undefined,
        currency: session.currency ?? undefined,
      });
    }
  } catch (error) {
    logger.warn("stripe_return_confirmation_failed", { error });
  }
}
