import "server-only";
import type { PaymentStatus } from "@prisma/client";
import { db } from "@/lib/db";
import type { PaymentState } from "./states";

const STATE_BY_STATUS: Record<PaymentStatus, PaymentState> = {
  PENDING: "PAYMENT_INITIATED",
  PAID: "PAYMENT_SUCCESS",
  FAILED: "PAYMENT_FAILED",
  CANCELLED: "PAYMENT_CANCELLED",
  REFUNDED: "UNPAID",
};

export function paymentStateFor(status: PaymentStatus | null): PaymentState {
  return status ? STATE_BY_STATUS[status] : "UNPAID";
}

/**
 * The purchase state of a reading, from its most recent payment. Display only:
 * access is decided by the entitlement that a verified payment grants.
 */
export async function readingPaymentState(readingId: string): Promise<PaymentState> {
  const latest = await db.payment.findFirst({
    where: { readingId },
    orderBy: { createdAt: "desc" },
    select: { status: true },
  });
  return paymentStateFor(latest?.status ?? null);
}
