"use client";

import { useEffect } from "react";

/** Remembers a referral code from `?ref=CODE` so it can be credited at signup. */
export function ReferralCapture() {
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get("ref")?.toUpperCase();
      if (ref && /^[A-Z2-9]{8}$/.test(ref) && !localStorage.getItem("palmai.ref")) {
        localStorage.setItem("palmai.ref", ref);
      }
    } catch {
      // Storage unavailable (private mode): the referral simply isn't recorded.
    }
  }, []);
  return null;
}
