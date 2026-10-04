import { ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import type { ReadingView } from "@/lib/readings/view";
import { RetryInterpretation } from "./retry-interpretation";

/** Shown when a reading exists but isn't complete (rejected, failed or interrupted). */
export function ReadingStatusPanel({ reading }: { reading: ReadingView }) {
  const canRetry =
    reading.status === "ANALYZED" ||
    reading.status === "FAILED" ||
    reading.status === "INTERPRETING";
  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-16 sm:px-6">
      <h1 className="text-3xl text-parchment">
        {reading.status === "REJECTED" ? "We couldn't read this photo" : "Your reading isn't ready"}
      </h1>
      {reading.status === "REJECTED" ? (
        <Alert tone="warning">
          {reading.rejectionReason ??
            "The palm wasn't clear enough in this photo. Please try another one."}
        </Alert>
      ) : (
        <Alert tone="info">
          {canRetry && reading.features.length > 0
            ? "Your palm was analyzed, but the reading wasn't finished. You can try generating it again."
            : "This reading didn't finish. Please start a new one."}
        </Alert>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        {canRetry && reading.features.length > 0 ? (
          <RetryInterpretation readingId={reading.id} />
        ) : null}
        <ButtonLink href="/read" variant={canRetry ? "secondary" : "primary"}>
          Start a new reading
        </ButtonLink>
      </div>
    </div>
  );
}
