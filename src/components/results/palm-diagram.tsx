"use client";

import { msg } from "@/lib/i18n/msg";
import { useT } from "@/components/i18n/i18n";
import { T } from "@/components/i18n/i18n";
import { useState } from "react";
import {
  LINE_COLORS,
  PALM_LINES,
  PALM_OUTLINE,
  PALM_VIEWBOX,
} from "@/components/palm/palm-geometry";
import { lineLabel } from "@/lib/palmistry/features";
import type { LineObservationView } from "@/lib/readings/view";
import { cn } from "@/lib/cn";

const STATE_TEXT = {
  observed: msg("Observed"),
  not_visible: msg("Not clearly visible"),
  insufficient_visibility: msg("Couldn't assess"),
} as const;

/**
 * Generic palm diagram. Line positions are illustrative — they show WHICH
 * lines were detected and how confidently, not their exact location on your hand.
 */
export function PalmDiagram({
  hand,
  lines,
}: {
  hand: "left" | "right";
  lines: LineObservationView[];
}) {
  const tx = useT();
  const [active, setActive] = useState<string | null>(null);
  const mirror = hand === "right";

  return (
    <div className="grid items-center gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <svg
        viewBox={PALM_VIEWBOX}
        className="mx-auto h-auto w-full max-w-[16rem]"
        role="img"
        aria-label={tx("Diagram of a {0} palm highlighting the lines that were detected", [hand])}
      >
        <g transform={mirror ? "translate(300 0) scale(-1 1)" : undefined}>
          <path d={`${PALM_OUTLINE} Z`} fill="rgb(42 30 23 / 0.035)" />
          <path
            d={PALM_OUTLINE}
            fill="none"
            stroke="rgb(246 224 173 / 0.45)"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {lines.map((line) => {
            if (line.state === "insufficient_visibility") return null;
            const observed = line.state === "observed";
            const dim = active !== null && active !== line.line;
            return (
              <path
                key={line.line}
                d={PALM_LINES[line.line].d}
                fill="none"
                stroke={LINE_COLORS[line.line]}
                strokeWidth={active === line.line ? 4 : 2.6}
                strokeLinecap="round"
                strokeDasharray={observed ? undefined : "3 6"}
                opacity={dim ? 0.2 : observed ? 0.35 + 0.65 * (line.confidence ?? 0) : 0.35}
                className="transition-all duration-300"
              />
            );
          })}
        </g>
      </svg>

      <ul className="space-y-2" aria-label={tx("Major lines")}>
        {lines.map((line) => (
          <li key={line.line}>
            <button
              type="button"
              onMouseEnter={() => setActive(line.line)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(line.line)}
              onBlur={() => setActive(null)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
                active === line.line
                  ? "border-white/20 bg-white/[0.06]"
                  : "border-white/5 bg-white/[0.02]",
              )}
            >
              <span
                className="size-3 shrink-0 rounded-full"
                style={{
                  background: LINE_COLORS[line.line],
                  opacity: line.state === "observed" ? 1 : 0.35,
                }}
                aria-hidden="true"
              />
              <span className="flex-1">
                <span className="block text-sm font-medium text-parchment">
                  <T s={lineLabel(line.line)} />
                </span>
                <span className="block text-xs text-mist">
                  <T s={STATE_TEXT[line.state]} />
                  {line.state === "observed" && line.confidence !== null
                    ? tx(" · {0}% confidence", [Math.round(line.confidence * 100)])
                    : ""}
                </span>
              </span>
            </button>
          </li>
        ))}
        <li className="px-1 pt-1 text-xs leading-snug text-mist-dim">
          <T s="Generic diagram — line positions are illustrative, not measured from your photo." />
        </li>
      </ul>
    </div>
  );
}
