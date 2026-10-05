import "server-only";
import { Prisma, type PaymentProvider } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { trackServerEvent } from "@/lib/analytics/server";
import type { Actor } from "@/lib/auth/actor";
import { getEnv } from "@/lib/config/env";
import { siteConfig } from "@/lib/config/site";
import { db } from "@/lib/db";
import { hasPremiumAccess } from "@/lib/entitlements";
import { AppError } from "@/lib/http/errors";
import { logger } from "@/lib/logger";
import { getOwnedReading } from "@/lib/readings/service";
import {
  getPaymentProvider,
  getProviderByName,
  isRazorpayTestMode,
  razorpayProvider,
  stripeProvider,
} from "./index";
import { funnelContext, trackFunnelEvent } from "@/lib/monetization/funnel";
import {
  addToLedger,
  assertPaymentOwner,
  grantOrder,
  prepareOrder,
  returnPathFor,
  type Order,
} from "@/lib/monetization/orders";
import { paymentsEnabled } from "./pricing";
import type { CheckoutSession, PaymentProviderName, WebhookEvent } from "./types";
import { WebhookSignatureError } from "./types";

export type CheckoutResponse =
  | { type: "redirect"; url: string }
  | { type: "completed" }
  | {
      type: "razorpay";
      /** Our payment id, so the browser can cancel this attempt if the window is closed. */
      paymentId: string;
      keyId: string;
      orderId: string;
      amount: number;
      currency: string;
      name: string;
      description: string;
    };

/** Funnel analytics for a payment; mock (test) payments are always flagged as demo. */
async function trackPaymentEvent(
  name:
    | "extended_checkout_started"
    | "extended_payment_success"
    | "extended_payment_failed"
    | "extended_reading_unlocked",
  payment: { readingId: string | null; provider: PaymentProvider },
  extra: Record<string, string | number | boolean> = {},
): Promise<void> {
  if (!payment.readingId) return;
  const context = await funnelContext(payment.readingId, {
    testPayment:
      payment.provider === "MOCK" || (payment.provider === "RAZORPAY" && isRazorpayTestMode()),
  });
  if (context)
    await trackFunnelEvent(name, context, { payment_provider: payment.provider, ...extra });
}

/**
 * Begin a purchase of the detailed reading for ONE reading the actor owns. The
 * reading id and price are fixed server-side on the payment record, so a
 * payment can only ever unlock the reading it was created for.
 */
export async function startCheckout(readingId: string, actor: Actor): Promise<CheckoutResponse> {
  return startOrderCheckout({ product: "DETAILED_READING", readingId }, actor);
}

/**
 * Begin a purchase of any catalogue product. What is bought, for whom and at
 * what price is decided here from the catalogue — never by the request.
 */
export async function startOrderCheckout(order: Order, actor: Actor): Promise<CheckoutResponse> {
  const prepared = await prepareOrder(order, actor);
  if (prepared.alreadyOwned) return { type: "completed" };

  const provider = getPaymentProvider();
  const currency = "inr";
  const payment = await db.payment.create({
    data: {
      provider: provider.name,
      product: prepared.product,
      amount: prepared.amountPaise,
      currency,
      readingId: prepared.readingId,
      compatibilityId: prepared.compatibilityId,
      userId: prepared.userId,
    },
  });

  const base = getEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const back = `${base}${prepared.returnPath}`;
  const description = `${siteConfig.name}: ${prepared.description}`;
  let session: CheckoutSession;
  try {
    session = await provider.createCheckout({
      paymentId: payment.id,
      readingId: prepared.readingId ?? undefined,
      amount: prepared.amountPaise,
      currency,
      successUrl: `${back}?checkout=success`,
      cancelUrl: `${back}?checkout=cancelled`,
      customerEmail: actor.user?.email,
      description,
    });
  } catch (error) {
    await db.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    await trackPaymentEvent("extended_payment_failed", payment, { reason: "checkout_error" });
    throw error instanceof AppError ? error : new AppError("PAYMENT_ERROR", { internal: error });
  }
  await db.payment.update({
    where: { id: payment.id },
    data: { providerRef: session.providerRef },
  });
  await trackPaymentEvent("extended_checkout_started", payment);

  switch (session.type) {
    case "completed":
      await fulfillPayment({
        providerRef: session.providerRef,
        amount: prepared.amountPaise,
        currency,
      });
      return { type: "completed" };
    case "redirect":
      return { type: "redirect", url: session.url };
    case "razorpay":
      return {
        type: "razorpay",
        paymentId: payment.id,
        keyId: session.keyId,
        orderId: session.orderId,
        amount: session.amount,
        currency: session.currency,
        name: siteConfig.name,
        description,
      };
  }
}

/**
 * Pay for a product from the PalmAI wallet. The balance is debited only if it
 * covers the price, in the same transaction that delivers the product.
 */
export async function payWithWallet(
  order: Order,
  actor: Actor,
): Promise<{ status: "completed"; balancePaise: number }> {
  if (!actor.user) {
    throw new AppError("UNAUTHORIZED", { message: "Please sign in to use your wallet." });
  }
  if (order.product === "WALLET_TOPUP") throw new AppError("VALIDATION_ERROR");
  const userId = actor.user.id;
  const prepared = await prepareOrder(order, actor);
  if (!prepared.alreadyOwned) {
    await db.$transaction(async (tx) => {
      const debited = await tx.user.updateMany({
        where: { id: userId, walletBalance: { gte: prepared.amountPaise } },
        data: { walletBalance: { decrement: prepared.amountPaise } },
      });
      if (debited.count === 0) {
        throw new AppError("PAYMENT_ERROR", {
          message: "Your wallet balance isn't enough for this. Add money to your wallet first.",
        });
      }
      const payment = await tx.payment.create({
        data: {
          provider: "WALLET",
          product: prepared.product,
          amount: prepared.amountPaise,
          currency: "inr",
          readingId: prepared.readingId,
          compatibilityId: prepared.compatibilityId,
          userId: prepared.userId ?? userId,
          providerRef: `wallet_${randomUUID()}`,
          status: "PAID",
          paidAt: new Date(),
        },
      });
      await tx.ledgerEntry.create({
        data: {
          userId,
          unit: "WALLET_PAISE",
          delta: -prepared.amountPaise,
          reason: "purchase",
          refId: payment.id,
        },
      });
      await grantOrder(tx, payment);
    });
    // Not "purchase_completed": the real money was counted when the wallet was topped up.
    await trackServerEvent("wallet_payment", {
      userId,
      readingId: prepared.readingId,
      properties: { amount: prepared.amountPaise, product: prepared.product },
    });
  }
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { walletBalance: true },
  });
  return { status: "completed", balancePaise: user.walletBalance };
}

/**
 * Unlock one of the actor's readings with a detailed-reading credit (family
 * pack, gift or referral reward). One credit per reading, at most once.
 */
export async function unlockWithCredit(readingId: string, actor: Actor): Promise<void> {
  if (!actor.user) throw new AppError("UNAUTHORIZED");
  const userId = actor.user.id;
  const reading = await getOwnedReading(readingId, actor);
  if (reading.status !== "COMPLETE") {
    throw new AppError("CONFLICT", { message: "This reading isn't ready yet." });
  }
  if (await hasPremiumAccess({ readingId: reading.id, ownerUserId: reading.userId })) return;
  await db.$transaction(async (tx) => {
    const spent = await tx.user.updateMany({
      where: { id: userId, readingCredits: { gt: 0 } },
      data: { readingCredits: { decrement: 1 } },
    });
    if (spent.count === 0) {
      throw new AppError("PAYMENT_ERROR", { message: "You don't have any reading credits left." });
    }
    await tx.ledgerEntry.create({
      data: { userId, unit: "READING_CREDIT", delta: -1, reason: "unlock", refId: reading.id },
    });
    await tx.entitlement.create({
      data: { type: "READING_PREMIUM", readingId: reading.id, userId },
    });
  });
  await trackServerEvent("credit_used", { userId, readingId: reading.id });
  const context = await funnelContext(reading.id);
  if (context) await trackFunnelEvent("extended_reading_unlocked", context, { via: "credit" });
}

/** Redeem a gift code: adds one detailed-reading credit to the signed-in account. */
export async function redeemGift(code: string, actor: Actor): Promise<void> {
  if (!actor.user) {
    throw new AppError("UNAUTHORIZED", {
      message: "Please sign in (it's free) to redeem your gift.",
    });
  }
  const userId = actor.user.id;
  const normalized = code.trim().toUpperCase();
  await db.$transaction(async (tx) => {
    const gift = await tx.giftCode.findUnique({ where: { code: normalized } });
    const claimed = gift
      ? await tx.giftCode.updateMany({
          where: { id: gift.id, redeemedById: null, expiresAt: { gt: new Date() } },
          data: { redeemedById: userId, redeemedAt: new Date() },
        })
      : { count: 0 };
    if (!gift || claimed.count === 0) {
      throw new AppError("NOT_FOUND", {
        message: "This gift code isn't valid, has expired or was already used.",
      });
    }
    await addToLedger(tx, {
      userId,
      unit: "READING_CREDIT",
      delta: 1,
      reason: "gift",
      refId: gift.id,
    });
  });
  await trackServerEvent("gift_redeemed", { userId });
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
    await grantOrder(tx, { ...payment, status: "PAID" });
    return "fulfilled" as const;
  });

  if (outcome === "fulfilled" || outcome === "mismatch") {
    const payment = await db.payment.findUnique({ where: { providerRef: input.providerRef } });
    if (payment && outcome === "fulfilled") {
      await trackServerEvent("purchase_completed", {
        userId: payment.userId,
        readingId: payment.readingId,
        properties: {
          provider: payment.provider,
          amount: payment.amount,
          product: payment.product,
        },
      });
      await trackPaymentEvent("extended_payment_success", payment);
      if (payment.product === "DETAILED_READING") {
        await trackPaymentEvent("extended_reading_unlocked", payment);
      }
    } else if (payment) {
      await trackPaymentEvent("extended_payment_failed", payment, { reason: "amount_mismatch" });
    }
  }
  if (outcome !== "fulfilled" && outcome !== "already_fulfilled") {
    logger.error("payment_fulfillment_problem", { outcome, providerRef: input.providerRef });
  }
  return outcome;
}

/** A pending payment failed at the provider. The reading stays locked. */
export async function failPayment(providerRef: string): Promise<void> {
  const updated = await db.payment.updateMany({
    where: { providerRef, status: "PENDING" },
    data: { status: "FAILED" },
  });
  if (updated.count > 0) {
    const payment = await db.payment.findUnique({ where: { providerRef } });
    if (payment) await trackPaymentEvent("extended_payment_failed", payment, { reason: "failed" });
  }
}

/**
 * The customer closed or abandoned checkout for a reading they own. Pending
 * payments are marked CANCELLED; the reading stays locked. (If the provider
 * later reports the payment as paid after all, fulfilment still applies.)
 */
export async function cancelPendingCheckout(readingId: string, actor: Actor): Promise<void> {
  const reading = await getOwnedReading(readingId, actor);
  const pending = await db.payment.findMany({
    where: { readingId: reading.id, status: "PENDING" },
    select: { id: true, readingId: true, provider: true },
  });
  if (pending.length === 0) return;
  await db.payment.updateMany({
    where: { id: { in: pending.map((p) => p.id) }, status: "PENDING" },
    data: { status: "CANCELLED" },
  });
  await trackPaymentEvent("extended_payment_failed", pending[0]!, { reason: "cancelled" });
}

/** The customer closed checkout for one specific payment (e.g. a pack or a top-up). */
export async function cancelPayment(paymentId: string, actor: Actor): Promise<void> {
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new AppError("NOT_FOUND");
  await assertPaymentOwner(payment, actor);
  const updated = await db.payment.updateMany({
    where: { id: payment.id, status: "PENDING" },
    data: { status: "CANCELLED" },
  });
  if (updated.count > 0) {
    await trackPaymentEvent("extended_payment_failed", payment, { reason: "cancelled" });
  }
}

/**
 * Settle a sandbox (mock) checkout. Only the buyer can do this, only while the
 * mock provider is active and allowed (never in production unless DEMO_MODE),
 * and only for a pending MOCK payment. No money is involved.
 */
export async function completeMockPayment(
  paymentId: string,
  outcome: "success" | "failure" | "cancel",
  actor: Actor,
): Promise<{ readingId: string | null; returnPath: string }> {
  if (getEnv().PAYMENT_PROVIDER !== "mock" || !paymentsEnabled()) {
    throw new AppError("NOT_FOUND");
  }
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.provider !== "MOCK" || !payment.providerRef) {
    throw new AppError("NOT_FOUND");
  }
  await assertPaymentOwner(payment, actor);
  if (payment.status !== "PENDING") {
    throw new AppError("CONFLICT", { message: "This checkout has already finished." });
  }
  if (outcome === "success") {
    await fulfillPayment({
      providerRef: payment.providerRef,
      amount: payment.amount,
      currency: payment.currency,
    });
  } else if (outcome === "failure") {
    await failPayment(payment.providerRef);
  } else if (payment.readingId) {
    await cancelPendingCheckout(payment.readingId, actor);
  } else {
    await cancelPayment(payment.id, actor);
  }
  return { readingId: payment.readingId, returnPath: returnPathFor(payment) };
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

/**
 * Razorpay Checkout success handler. The browser's callback is only a hint:
 * the signature must verify with our key secret, AND the payment fetched from
 * Razorpay's API must belong to this order, be captured, and match the stored
 * amount and currency. An authorized-but-uncaptured payment stays pending and
 * is completed by the webhook.
 */
export async function confirmRazorpayPayment(
  input: { orderId: string; paymentId: string; signature: string },
  actor: Actor,
): Promise<{ status: "paid" | "pending" }> {
  const payment = await db.payment.findUnique({ where: { providerRef: input.orderId } });
  if (!payment || payment.provider !== "RAZORPAY") throw new AppError("NOT_FOUND");
  await assertPaymentOwner(payment, actor);
  if (payment.status === "PAID") return { status: "paid" };
  const provider = razorpayProvider();
  if (!provider.verifyPaymentSignature(input.orderId, input.paymentId, input.signature)) {
    throw new AppError("PAYMENT_ERROR", { message: "We couldn't verify this payment." });
  }

  let remote;
  try {
    remote = await provider.fetchPayment(input.paymentId);
  } catch (error) {
    // Signature is valid but Razorpay couldn't be reached: the webhook will settle it.
    logger.warn("razorpay_payment_lookup_failed", { error });
    return { status: "pending" };
  }
  if (remote.order_id !== input.orderId) {
    throw new AppError("PAYMENT_ERROR", { message: "We couldn't verify this payment." });
  }
  if (remote.status === "captured") {
    const outcome = await fulfillPayment({
      providerRef: input.orderId,
      providerPaymentId: remote.id,
      amount: remote.amount,
      currency: remote.currency,
    });
    if (outcome === "mismatch") {
      throw new AppError("PAYMENT_ERROR", { message: "We couldn't verify this payment." });
    }
    return { status: "paid" };
  }
  if (remote.status === "failed") {
    await failPayment(input.orderId);
    throw new AppError("PAYMENT_ERROR", { message: "This payment didn't go through." });
  }
  return { status: "pending" };
}

/**
 * On return from Stripe Checkout, confirm the session server-side so the
 * user sees their report immediately even if the webhook is still in flight.
 */
export async function confirmStripeReturn(
  sessionId: string,
  scope: string | { compatibilityId?: string; userId?: string },
): Promise<void> {
  try {
    const payment = await db.payment.findUnique({ where: { providerRef: sessionId } });
    if (!payment || payment.status === "PAID") return;
    // The session must belong to what the visitor is looking at.
    const matches =
      typeof scope === "string"
        ? payment.readingId === scope
        : scope.compatibilityId
          ? payment.compatibilityId === scope.compatibilityId
          : Boolean(scope.userId) && payment.userId === scope.userId && !payment.readingId;
    if (!matches) return;
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
