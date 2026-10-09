"use client";

import { useT } from "@/components/i18n/i18n";
import { T } from "@/components/i18n/i18n";
import { useState } from "react";
import { LINE_COLORS } from "@/components/palm/palm-geometry";
import { lineLabel } from "@/lib/palmistry/features";
import type { LineObservationView } from "@/lib/readings/view";

/**
 * The user's own photo (served through an authenticated, non-cached route)
 * with APPROXIMATE line markers — shown only for lines whose positions the
 * model reported with reasonable confidence.
 */
export function PhotoOverlay({
  readingId,
  lines,
}: {
  readingId: string;
  lines: LineObservationView[];
}) {
  const tx = useT();
  const [failed, setFailed] = useState(false);
  const [showMarkers, setShowMarkers] = useState(true);
  const withPaths = lines.filter((l) => l.approximatePath && l.approximatePath.length >= 2);

  if (failed) {
    return (
      <p className="text-sm text-mist">
        <T s="Your photo is no longer available." />
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-black">
        {/* Private image from an authenticated API route; next/image optimisation would cache it. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/readings/${readingId}/image`}
          alt={tx("Your palm photo")}
          className="block h-auto w-full"
          onError={() => setFailed(true)}
        />
        {showMarkers && withPaths.length > 0 ? (
          <svg
            viewBox="0 0 1 1"
            preserveAspectRatio="none"
            className="absolute inset-0 size-full"
            aria-hidden="true"
          >
            {withPaths.map((line) => (
              <polyline
                key={line.line}
                points={line.approximatePath!.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke={LINE_COLORS[line.line]}
                strokeWidth="0.012"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="0.02 0.015"
                opacity="0.9"
              />
            ))}
          </svg>
        ) : null}
        <span className="absolute top-3 left-3 rounded-full bg-night-950/80 px-3 py-1 text-xs text-gold-200 backdrop-blur">
          <T s="Approximate positions" />
        </span>
      </div>
      {withPaths.length > 0 ? (
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-mist">
          {withPaths.map((line) => (
            <span key={line.line} className="inline-flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-full"
                style={{ background: LINE_COLORS[line.line] }}
                aria-hidden="true"
              />
              <T s={lineLabel(line.line)} />
            </span>
          ))}
          <button
            type="button"
            className="min-h-11 rounded-full px-3 text-gold-300 underline-offset-4 hover:underline"
            onClick={() => setShowMarkers((v) => !v)}
            aria-pressed={showMarkers}
          >
            {showMarkers ? tx("Hide markers") : tx("Show markers")}
          </button>
        </div>
      ) : (
        <p className="text-center text-xs text-mist-dim">
          <T s="We weren't confident enough about exact line positions to mark them on your photo." />
        </p>
      )}
    </div>
  );
}
