"use client";

import { useT } from "@/components/i18n/i18n";
import { LINE_NAMES, MOUNT_NAMES } from "@/lib/schemas/palm-analysis";
import { PALM_LINES, PALM_MOUNTS, PALM_OUTLINE, PALM_VIEWBOX } from "./palm-geometry";

/**
 * Landing-page palm, drawn like an ink sketch in an old palmistry manual:
 * ink outline on a henna-toned hand, lines in sindoor, mounts as small dots,
 * inside a block-print border. Pure SVG, no images.
 */
export function PalmIllustration({ className }: { className?: string }) {
  const tx = useT();
  return (
    <svg
      viewBox={PALM_VIEWBOX}
      className={className}
      role="img"
      aria-label={tx("Ink drawing of an open palm with its major palmistry lines")}
    >
      {/* block-print border */}
      <circle cx="150" cy="230" r="162" fill="#efe2c8" />
      <circle cx="150" cy="230" r="162" fill="none" stroke="#2a1e17" strokeOpacity="0.5" />
      <circle
        cx="150"
        cy="230"
        r="152"
        fill="none"
        stroke="#9c3b1b"
        strokeOpacity="0.55"
        strokeWidth="3"
        strokeDasharray="1 9"
        strokeLinecap="round"
      />

      <path d={`${PALM_OUTLINE} Z`} fill="#e8c9a2" />
      <path
        d={PALM_OUTLINE}
        fill="none"
        stroke="#2a1e17"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {LINE_NAMES.map((line, index) => (
        <path
          key={line}
          d={PALM_LINES[line].d}
          pathLength={1}
          fill="none"
          stroke="#9c3b1b"
          strokeWidth={line === "fate" ? 1.8 : 2.6}
          strokeLinecap="round"
          className="draw-path"
          style={{ animationDelay: `${0.3 + index * 0.3}s` }}
        />
      ))}

      {MOUNT_NAMES.map((mount) => (
        <circle
          key={mount}
          cx={PALM_MOUNTS[mount].x}
          cy={PALM_MOUNTS[mount].y}
          r="2.4"
          fill="#2a1e17"
          fillOpacity="0.55"
        />
      ))}
    </svg>
  );
}
