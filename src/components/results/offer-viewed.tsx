"use client";

import { useEffect } from "react";
import { trackReadingEvent } from "@/lib/analytics/client";

// Once per reading per page session (also absorbs React's dev double-invoked effects).
const reported = new Set<string>();

/** Records extended_offer_viewed when the detailed-reading offer is shown. */
export function OfferViewed({ readingId }: { readingId: string }) {
  useEffect(() => {
    if (reported.has(readingId)) return;
    reported.add(readingId);
    trackReadingEvent("extended_offer_viewed", readingId);
  }, [readingId]);
  return null;
}
