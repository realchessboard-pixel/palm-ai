"use client";

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
      setError(err instanceof ApiClientError ? err.message : "Couldn't delete the reading.");
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <Button variant="ghost" size={size} onClick={() => setConfirming(true)}>
        Delete
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Confirm deletion">
      <span className="text-sm text-mist">Delete this reading and photo permanently?</span>
      <Button variant="danger" size="sm" onClick={remove} disabled={busy}>
        {busy ? "Deleting…" : "Yes, delete"}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={busy}>
        Cancel
      </Button>
      {error ? (
        <p role="alert" className="w-full text-sm text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
