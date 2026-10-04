import { PALM_OUTLINE, PALM_VIEWBOX } from "./palm-geometry";
import { cn } from "@/lib/cn";

/** Dashed palm-shaped framing guide shown over the camera preview. */
export function PalmGuide({ hand, className }: { hand: "left" | "right"; className?: string }) {
  return (
    <svg viewBox={PALM_VIEWBOX} className={cn("pointer-events-none", className)} aria-hidden="true">
      <g transform={hand === "right" ? "translate(300 0) scale(-1 1)" : undefined}>
        <path
          d={PALM_OUTLINE}
          fill="none"
          stroke="rgb(246 224 173 / 0.95)"
          strokeWidth="2.2"
          strokeDasharray="7 7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
