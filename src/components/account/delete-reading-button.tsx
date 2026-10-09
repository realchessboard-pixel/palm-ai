"use client";

import { useT } from "@/components/i18n/i18n";
import { T } from "@/components/i18n/i18n";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ApiClientError, apiFetch } from "@/lib/api-client";

export function DeleteReadingButton({
  readingId,
  redirectTo,
  size = "md",
}: {
  readingId: string;
  redirectTo?: string;
  size?: "sm" | "md";
}) {
  const tx = useT();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/readings/${readingId}`, { method: "DELETE" });
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : tx("Couldn't delete the reading."));
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <Button variant="ghost" size={size} onClick={() => setConfirming(true)}>
        <T s="Delete" />
      </Button>
    );
  }
  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label={tx("Confirm deletion")}
    >
      <span className="text-sm text-mist">
        <T s="Delete this reading and photo permanently?" />
      </span>
      <Button variant="danger" size="sm" onClick={remove} disabled={busy}>
        {busy ? tx("Deleting…") : tx("Yes, delete")}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={busy}>
        <T s="Cancel" />
      </Button>
      {error ? (
        <p role="alert" className="w-full text-sm text-red-300">
          <T s={error} />
        </p>
      ) : null}
    </div>
  );
}
