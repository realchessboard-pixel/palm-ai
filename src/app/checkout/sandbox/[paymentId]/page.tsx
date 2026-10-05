import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SandboxCheckout } from "@/components/results/sandbox-checkout";
import { getActor } from "@/lib/auth/actor";
import { getEnv } from "@/lib/config/env";
import { db } from "@/lib/db";
import { isAppError } from "@/lib/http/errors";
import { PRODUCTS, formatInr } from "@/lib/monetization/price";
import { paymentsEnabled } from "@/lib/payments/pricing";
import { assertPaymentOwner, returnPathFor } from "@/lib/monetization/orders";
import { IdSchema } from "@/lib/schemas/api";

const PRODUCT_NAMES: Record<string, string> = {
  ...Object.fromEntries(Object.entries(PRODUCTS).map(([k, v]) => [k, v.name])),
  WALLET_TOPUP: "PalmAI wallet top-up",
  READER_QUESTIONS: "Questions for an AI reader",
};

export const metadata: Metadata = {
  title: "Test checkout",
  robots: { index: false, follow: false },
};

/**
 * Sandbox checkout for the mock payment provider (development / demo only).
 * Lets a tester simulate a successful, failed or cancelled payment.
 */
export default async function SandboxCheckoutPage({
  params,
}: {
  params: Promise<{ paymentId: string }>;
}) {
  const { paymentId } = await params;
  if (!IdSchema.safeParse(paymentId).success) notFound();
  if (getEnv().PAYMENT_PROVIDER !== "mock" || !paymentsEnabled()) notFound();

  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.provider !== "MOCK") notFound();
  try {
    await assertPaymentOwner(payment, await getActor());
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  }
  if (payment.status !== "PENDING") redirect(returnPathFor(payment));

  return (
    <SandboxCheckout
      paymentId={payment.id}
      backHref={returnPathFor(payment)}
      productName={PRODUCT_NAMES[payment.product]}
      amountLabel={formatInr(payment.amount / 100)}
    />
  );
}
