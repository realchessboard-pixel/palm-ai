"use client";

import { msg } from "@/lib/i18n/msg";
import { useT } from "@/components/i18n/i18n";
import { T } from "@/components/i18n/i18n";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { track } from "@/lib/analytics/client";
import { ApiClientError, postJson } from "@/lib/api-client";

type CheckoutResponse =
  | { type: "redirect"; url: string }
  | { type: "completed" }
  | {
      type: "razorpay";
      paymentId: string;
      keyId: string;
      orderId: string;
      amount: number;
      currency: string;
      name: string;
      description: string;
    };

interface RazorpayResult {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(msg("Could not load the payment window.")));
    document.head.appendChild(script);
  });
}

/** What can be bought. Prices are always decided by the server. */
export type BuyOrder =
  | { product: "DETAILED_READING"; readingId: string }
  | { product: "COUPLE_COMPATIBILITY"; compatibilityId: string }
  | { product: "FAMILY_PACK" }
  | { product: "GIFT_READING" }
  | { product: "MEMBERSHIP_YEAR" }
  | { product: "KUNDLI_REPORT"; kundliId: string }
  | { product: "MILAN_REPORT"; milanId: string }
  | { product: "RASHIFAL_REPORT"; kundliId: string }
  | { product: "READER_QUESTIONS"; chatId: string; plan: "single" | "bundle" }
  | { product: "WALLET_TOPUP"; payInr: number };

/**
 * Buy any catalogue product: opens Razorpay (or redirects to Stripe / the
 * sandbox) and refreshes the page once the server has a verified payment.
 */
export function BuyButton({
  order,
  label,
  variant = "primary",
  size = "lg",
  className = "w-full sm:w-auto",
  onDone,
}: {
  order: BuyOrder;
  label: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Called after a confirmed purchase (defaults to refreshing the page). */
  onDone?: () => void;
}) {
  const tx = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const done = onDone ?? (() => router.refresh());

  async function buy() {
    setBusy(true);
    setError(null);
    track("premium_clicked", { product: order.product });
    try {
      const checkout = await postJson<CheckoutResponse>("/api/payments/checkout", order);
      track("checkout_started", { provider: checkout.type, product: order.product });
      if (checkout.type === "redirect") {
        window.location.assign(checkout.url);
        return;
      }
      if (checkout.type === "completed") {
        done();
        setBusy(false);
        return;
      }
      await loadRazorpay();
      if (!window.Razorpay) throw new Error(msg("Payment window unavailable."));
      const rzp = new window.Razorpay({
        key: checkout.keyId,
        order_id: checkout.orderId,
        amount: checkout.amount,
        currency: checkout.currency,
        name: checkout.name,
        description: checkout.description,
        theme: { color: "#d29a3b" },
        handler: async (result: RazorpayResult) => {
          try {
            const verified = await postJson<{ status: "paid" | "pending" }>(
              "/api/payments/razorpay/verify",
              {
                orderId: result.razorpay_order_id,
                paymentId: result.razorpay_payment_id,
                signature: result.razorpay_signature,
              },
            );
            if (verified.status === "pending") {
              // Razorpay hasn't captured it yet; the webhook will complete the purchase.
              setConfirming(true);
              for (let i = 0; i < 10; i++) {
                await new Promise((resolve) => setTimeout(resolve, 3000));
                router.refresh();
              }
              return;
            }
            done();
          } catch (err) {
            setError(
              err instanceof ApiClientError
                ? err.message
                : tx("We couldn't confirm the payment yet."),
            );
          } finally {
            setBusy(false);
          }
        },
        modal: {
          ondismiss: () => {
            // Closing the window cancels this attempt; nothing is charged or delivered.
            void postJson("/api/payments/cancel", { paymentId: checkout.paymentId })
              .catch(() => undefined)
              .finally(() => {
                setBusy(false);
                router.refresh();
              });
          },
        },
      });
      rzp.open();
      return;
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : tx("We couldn't start checkout. Please try again."),
      );
    }
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      <Button size={size} variant={variant} className={className} onClick={buy} disabled={busy}>
        {busy ? tx("Opening checkout…") : label}
      </Button>
      {confirming ? (
        <Alert tone="info">
          <T s="Payment received — we're confirming it with Razorpay. This completes automatically; you can also refresh this page in a minute." />
        </Alert>
      ) : null}
      {error ? (
        <Alert tone="error">
          <T s={error} />
        </Alert>
      ) : null}
    </div>
  );
}
