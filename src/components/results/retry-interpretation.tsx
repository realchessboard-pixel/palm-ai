"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ApiClientError, postJson } from "@/lib/api-client";

export function RetryInterpretation({ readingId }: { readingId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            await postJson("/api/palm/interpret", { readingId });
            router.refresh();
          } catch (err) {
            setError(err instanceof ApiClientError ? err.message : "Please try again.");
            setBusy(false);
          }
        }}
      >
        {busy ? "Preparing your reading…" : "Finish my reading"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
