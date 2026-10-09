"use client";

import { useT } from "@/components/i18n/i18n";
import { T } from "@/components/i18n/i18n";
import { ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import type { ReadingView } from "@/lib/readings/view";

/**
 * Shown when a reading can't be displayed: the photo was rejected, or the
 * analysis didn't finish. (Analyzed readings resume on the results page.)
 */
export function ReadingStatusPanel({ reading }: { reading: ReadingView }) {
  const tx = useT();
  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-16 sm:px-6">
      <h1 className="text-3xl text-parchment">
        {reading.status === "REJECTED"
          ? tx("We couldn't read this photo")
          : tx("Your reading isn't ready")}
      </h1>
      {reading.status === "REJECTED" ? (
        <Alert tone="warning">
          {reading.rejectionReason ??
            tx("The palm wasn't clear enough in this photo. Please try another one.")}
        </Alert>
      ) : (
        <Alert tone="info">
          <T s="This reading didn't finish. Please start a new one." />
        </Alert>
      )}
      <ButtonLink href="/read">
        <T s="Start a new reading" />
      </ButtonLink>
    </div>
  );
}
