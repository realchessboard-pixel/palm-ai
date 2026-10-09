"use client";

import { useT } from "@/components/i18n/i18n";
import { T } from "@/components/i18n/i18n";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { ApiClientError, postJson } from "@/lib/api-client";

type Outcome = "success" | "failure" | "cancel";

export function SandboxCheckout({
  paymentId,
  backHref,
  productName,
  amountLabel,
}: {
  paymentId: string;
  backHref: string;
  productName: string;
  amountLabel: string;
}) {
  const tx = useT();
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
      setError(err instanceof ApiClientError ? err.message : tx("Please try again."));
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-16 sm:px-6">
      <Alert tone="warning" title={tx("Test checkout — no real payment")}>
        <T s="This is a sandbox for development and demos. No money is charged and test payments are never counted as revenue." />
      </Alert>
      <div className="card space-y-2 rounded-3xl p-6">
        <p className="text-sm text-mist">
          <T s={productName} />
        </p>
        <p className="text-4xl text-parchment">{amountLabel}</p>
      </div>
      <div className="grid gap-3">
        <Button size="lg" disabled={busy !== null} onClick={() => settle("success")}>
          {busy === "success" ? tx("Processing…") : tx("Simulate successful payment")}
        </Button>
        <Button variant="secondary" disabled={busy !== null} onClick={() => settle("failure")}>
          <T s="Simulate failed payment" />
        </Button>
        <Button variant="ghost" disabled={busy !== null} onClick={() => settle("cancel")}>
          <T s="Cancel checkout" />
        </Button>
      </div>
      {error ? (
        <Alert tone="error">
          <T s={error} />
        </Alert>
      ) : null}
      <ButtonLink href={backHref} variant="ghost" size="sm">
        <T s="Go back" />
      </ButtonLink>
    </div>
  );
}
