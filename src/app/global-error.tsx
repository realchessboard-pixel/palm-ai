"use client";

import { T } from "@/components/i18n/i18n";
/** Last-resort boundary if the root layout itself fails. Kept dependency-free. */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{ background: "#f4ecdd", color: "#2a1e17", fontFamily: "system-ui, sans-serif" }}
      >
        <main style={{ maxWidth: 420, margin: "20vh auto", padding: 16, textAlign: "center" }}>
          <h1 style={{ fontSize: 28 }}>
            <T s="Something went wrong" />
          </h1>
          <p style={{ color: "#b8b0c4" }}>
            <T s="Please try again in a moment." />
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 24,
              padding: "12px 24px",
              borderRadius: 999,
              border: 0,
              background: "#efcb83",
            }}
          >
            <T s="Try again" />
          </button>
        </main>
      </body>
    </html>
  );
}
