"use client";

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
    script.onerror = () => reject(new Error("Could not load the payment window."));
    document.head.appendChild(script);
  });
}

export function UnlockButton({ readingId, priceLabel }: { readingId: string; priceLabel: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function unlock() {
    setBusy(true);
    setError(null);
    track("premium_clicked");
    try {
      const checkout = await postJson<CheckoutResponse>("/api/payments/checkout", { readingId });
      track("checkout_started", { provider: checkout.type });
      if (checkout.type === "redirect") {
        window.location.assign(checkout.url);
        return;
      }
      if (checkout.type === "completed") {
        router.refresh();
        return;
      }
      await loadRazorpay();
      if (!window.Razorpay) throw new Error("Payment window unavailable.");
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
              // Razorpay hasn't captured it yet; the webhook will unlock the reading.
              setConfirming(true);
              for (let i = 0; i < 10; i++) {
                await new Promise((resolve) => setTimeout(resolve, 3000));
                router.refresh();
              }
              return;
            }
            router.refresh();
          } catch (err) {
            setError(
              err instanceof ApiClientError ? err.message : "We couldn't confirm the payment yet.",
            );
          } finally {
            setBusy(false);
          }
        },
        modal: {
          ondismiss: () => {
            // Closing the window cancels this attempt; the reading stays locked.
            void postJson("/api/payments/cancel", { readingId })
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
          : "We couldn't start checkout. Please try again.",
      );
    }
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      <Button size="lg" className="w-full sm:w-auto" onClick={unlock} disabled={busy}>
        {busy ? "Opening checkout…" : `Unlock Detailed Reading — ${priceLabel}`}
      </Button>
      {confirming ? (
        <Alert tone="info">
          Payment received — we&apos;re confirming it with Razorpay. Your detailed reading will
          unlock automatically; you can also refresh this page in a minute.
        </Alert>
      ) : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  );
}
