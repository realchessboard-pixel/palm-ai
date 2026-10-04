"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";

/** Friendly error boundary — technical details stay in server logs. */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Only the opaque digest is surfaced; it lets support find the server log entry.
    if (error.digest) console.warn("Error reference:", error.digest);
  }, [error]);

  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-3xl">Something went wrong</h1>
      <p className="mt-3 text-mist">We couldn&apos;t load this page right now. Please try again.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/" variant="secondary">
          Home
        </ButtonLink>
      </div>
      {error.digest ? (
        <p className="mt-6 text-xs text-mist-dim">Reference: {error.digest}</p>
      ) : null}
    </div>
  );
}
