"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, Spinner } from "@/components/ui/misc";
import { ApiClientError, isTransientError, postJson } from "@/lib/api-client";

const POLL_MS = 3_000;
const GIVE_UP_MS = 3 * 60_000;
const AUTO_RETRIES = 2;

/**
 * Writes the detailed reading after it has been unlocked, then refreshes the
 * page to show it. Like InterpretationPending, it is safe to mount more than
 * once: the server lets one request write and answers the others with 409.
 */
export function DetailedPending({ readingId }: { readingId: string }) {
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const deadline = Date.now() + GIVE_UP_MS;
    let retries = 0;
    async function run() {
      while (!cancelled) {
        try {
          await postJson(`/api/readings/${readingId}/detailed`, {});
          if (!cancelled) router.refresh();
          return;
        } catch (err) {
          if (err instanceof ApiClientError && err.status === 409 && Date.now() < deadline) {
            await new Promise((resolve) => setTimeout(resolve, POLL_MS));
            continue;
          }
          if (retries < AUTO_RETRIES && isTransientError(err)) {
            retries++;
            await new Promise((resolve) => setTimeout(resolve, POLL_MS * retries));
            continue;
          }
          if (!cancelled) {
            setError(
              err instanceof ApiClientError && !isTransientError(err)
                ? err.message
                : "Your detailed reading is unlocked and saved — it just needs another moment to be written. Tap “Try again”.",
            );
          }
          return;
        }
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [readingId, attempt, router]);

  if (error) {
    return (
      <div className="glass space-y-4 rounded-3xl p-6">
        <Alert tone="error">{error}</Alert>
        <Button
          onClick={() => {
            setError(null);
            setAttempt((n) => n + 1);
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="glass flex items-start gap-4 rounded-3xl p-6" aria-live="polite">
      <Spinner label="Writing your detailed reading" className="mt-1" />
      <div>
        <h2 className="text-2xl text-gold-200">Writing your detailed reading…</h2>
        <p className="mt-2 leading-relaxed text-parchment/85">
          Thank you — it&apos;s unlocked. Your reader is now going line by line and parvat by parvat
          through your palm. This usually takes about 20 seconds, and it stays saved to this
          reading.
        </p>
      </div>
    </div>
  );
}
