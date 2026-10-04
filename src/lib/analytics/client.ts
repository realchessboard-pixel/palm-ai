"use client";

import type { AnalyticsEventName } from "./events";

/**
 * Client-side analytics: fire-and-forget POST to our own endpoint, so no
 * third-party tracker is loaded and no personal data leaves the app.
 */
export function track(
  name: AnalyticsEventName,
  properties?: Record<string, string | number | boolean>,
): void {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({ name, properties });
    // keepalive lets the request finish even when the page is navigating away.
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => undefined);
  } catch {
    // Analytics must never break the product.
  }
}
