"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { ApiClientError, postJson } from "@/lib/api-client";

type Outcome = "success" | "failure" | "cancel";

export function SandboxCheckout({
  paymentId,
  readingId,
  amountLabel,
}: {
  paymentId: string;
  readingId: string;
  amountLabel: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function settle(outcome: Outcome) {
    setBusy(outcome);
    setError(null);
    try {
      const { redirect } = await postJson<{ redirect: string }>("/api/payments/mock/complete", {
        paymentId,
        outcome,
      });
      router.replace(redirect);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Please try again.");
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-16 sm:px-6">
      <Alert tone="warning" title="Test checkout — no real payment">
        This is a sandbox for development and demos. No money is charged and test payments are never
        counted as revenue.
      </Alert>
      <div className="card space-y-2 rounded-3xl p-6">
        <p className="text-sm text-mist">Detailed palm reading</p>
        <p className="text-4xl text-parchment">{amountLabel}</p>
      </div>
      <div className="grid gap-3">
        <Button size="lg" disabled={busy !== null} onClick={() => settle("success")}>
          {busy === "success" ? "Processing…" : `Simulate successful payment`}
        </Button>
        <Button variant="secondary" disabled={busy !== null} onClick={() => settle("failure")}>
          Simulate failed payment
        </Button>
        <Button variant="ghost" disabled={busy !== null} onClick={() => settle("cancel")}>
          Cancel checkout
        </Button>
      </div>
      {error ? <Alert tone="error">{error}</Alert> : null}
      <ButtonLink href={`/readings/${readingId}`} variant="ghost" size="sm">
        Back to my reading
      </ButtonLink>
    </div>
  );
}
