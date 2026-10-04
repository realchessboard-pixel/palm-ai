"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics/client";
import type { AnalyticsEventName } from "@/lib/analytics/events";

export function TrackOnMount({
  event,
  properties,
}: {
  event: AnalyticsEventName;
  properties?: Record<string, string | number | boolean>;
}) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track(event, properties);
  }, [event, properties]);
  return null;
}
