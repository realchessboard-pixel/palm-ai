"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { track } from "@/lib/analytics/client";
import { ApiClientError, postJson } from "@/lib/api-client";
import type { BuyOrder } from "./buy-button";

/**
 * Use what the visitor already has instead of paying again: a reading credit
 * (from a family pack, gift or referrals) or their PalmAI wallet balance.
 */
export function BalanceUnlock({
  order,
  credits,
  walletLabel,
  canPayFromWallet,
}: {
  order: Exclude<BuyOrder, { product: "WALLET_TOPUP" }>;
  /** Reading credits available (only for the detailed reading). */
  credits: number;
  /** e.g. "₹110 in your wallet". */
  walletLabel: string | null;
  canPayFromWallet: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: "credit" | "wallet") {
    setBusy(true);
    setError(null);
    try {
      if (kind === "credit" && order.product === "DETAILED_READING") {
        await postJson(`/api/readings/${order.readingId}/unlock`, {});
      } else {
        await postJson("/api/payments/wallet", order);
      }
      track("checkout_started", { provider: kind, product: order.product });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "That didn't work. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const useCredit = order.product === "DETAILED_READING" && credits > 0;
  if (!useCredit && !canPayFromWallet) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {useCredit ? (
          <Button variant="secondary" onClick={() => run("credit")} disabled={busy}>
            Use 1 reading credit ({credits} left)
          </Button>
        ) : null}
        {canPayFromWallet ? (
          <Button variant="secondary" onClick={() => run("wallet")} disabled={busy}>
            Pay from wallet{walletLabel ? ` · ${walletLabel}` : ""}
          </Button>
        ) : null}
      </div>
      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  );
}
