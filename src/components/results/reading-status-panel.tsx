import { ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import type { ReadingView } from "@/lib/readings/view";

/**
 * Shown when a reading can't be displayed: the photo was rejected, or the
 * analysis didn't finish. (Analyzed readings resume on the results page.)
 */
export function ReadingStatusPanel({ reading }: { reading: ReadingView }) {
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
        <Alert tone="info">This reading didn&apos;t finish. Please start a new one.</Alert>
      )}
      <ButtonLink href="/read">Start a new reading</ButtonLink>
    </div>
  );
}
