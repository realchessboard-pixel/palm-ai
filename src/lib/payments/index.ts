import "server-only";
import { getEnv } from "@/lib/config/env";
import { AppError } from "@/lib/http/errors";
import { paymentsEnabled } from "./pricing";
import { MockPaymentProvider } from "./providers/mock";
import { RazorpayProvider } from "./providers/razorpay";
import { StripeProvider } from "./providers/stripe";
import type { PaymentProvider, PaymentProviderName } from "./types";

export type { PaymentProvider } from "./types";

export function stripeProvider(): StripeProvider {
  const env = getEnv();
  return new StripeProvider({
    secretKey: env.STRIPE_SECRET_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
  });
}

export function razorpayProvider(): RazorpayProvider {
  const env = getEnv();
  return new RazorpayProvider({
    keyId: env.RAZORPAY_KEY_ID,
    keySecret: env.RAZORPAY_KEY_SECRET,
    webhookSecret: env.RAZORPAY_WEBHOOK_SECRET,
  });
}

/** The provider used for new checkouts, selected by PAYMENT_PROVIDER. */
export function getPaymentProvider(): PaymentProvider {
  if (!paymentsEnabled()) throw new AppError("PAYMENT_NOT_CONFIGURED");
  switch (getEnv().PAYMENT_PROVIDER) {
    case "stripe":
      return stripeProvider();
    case "razorpay":
      return razorpayProvider();
    case "mock":
      return new MockPaymentProvider();
    default:
      throw new AppError("PAYMENT_NOT_CONFIGURED");
  }
}

/** Webhook handlers address providers by name, independent of the checkout default. */
export function getProviderByName(name: PaymentProviderName): PaymentProvider {
  if (name === "STRIPE") return stripeProvider();
  if (name === "RAZORPAY") return razorpayProvider();
  throw new AppError("NOT_FOUND");
}
