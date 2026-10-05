"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, Spinner } from "@/components/ui/misc";
import { ApiClientError, isTransientError, postJson } from "@/lib/api-client";

const POLL_MS = 3_000;
const GIVE_UP_MS = 3 * 60_000;
/** Temporary failures are retried quietly this many times before asking the user. */
const AUTO_RETRIES = 2;

/**
 * Writes the interpretation for an analyzed reading, then refreshes the page to
 * show it. Safe to mount more than once (refreshes, two tabs): the server lets
 * one request generate and answers the others with 409 until it's done, so
 * this just waits and asks again.
 */
export function InterpretationPending({ readingId }: { readingId: string }) {
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
          await postJson("/api/palm/interpret", { readingId });
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
                : "Your palm map is ready — the written reading just needs another moment. Tap “Try again” to finish it.",
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
      <Spinner label="Preparing your interpretation" className="mt-1" />
      <div>
        <h2 className="text-2xl text-gold-200">Preparing your interpretation…</h2>
        <p className="mt-2 leading-relaxed text-parchment/85">
          Your palm has been examined and its features are shown below. Your written reading usually
          follows in about 15 seconds.
        </p>
      </div>
    </div>
  );
}
