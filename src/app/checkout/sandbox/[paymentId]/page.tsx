import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SandboxCheckout } from "@/components/results/sandbox-checkout";
import { getActor } from "@/lib/auth/actor";
import { getEnv } from "@/lib/config/env";
import { db } from "@/lib/db";
import { isAppError } from "@/lib/http/errors";
import { formatInr } from "@/lib/monetization/price";
import { paymentsEnabled } from "@/lib/payments/pricing";
import { getOwnedReading } from "@/lib/readings/service";
import { IdSchema } from "@/lib/schemas/api";

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
  if (!payment || payment.provider !== "MOCK" || !payment.readingId) notFound();
  try {
    await getOwnedReading(payment.readingId, await getActor());
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  }
  if (payment.status !== "PENDING") redirect(`/readings/${payment.readingId}`);

  return (
    <SandboxCheckout
      paymentId={payment.id}
      readingId={payment.readingId}
      amountLabel={formatInr(payment.amount / 100)}
    />
  );
}
