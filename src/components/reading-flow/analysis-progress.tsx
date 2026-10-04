"use client";

import { useEffect, useState } from "react";
import { PalmIllustration } from "@/components/palm/palm-illustration";
import { cn } from "@/lib/cn";

export type PipelinePhase = "preparing" | "analyzing" | "interpreting" | "done";

const STEPS = [
  "Preparing image",
  "Examining palm structure",
  "Mapping major lines",
  "Studying traditional palmistry features",
  "Preparing your reading",
];

/**
 * Progress display. Only the phase boundaries are real (upload → vision
 * analysis → interpretation); the sub-steps inside the single vision call are
 * paced on a timer and never marked complete before that call returns.
 */
export function AnalysisProgress({ phase }: { phase: PipelinePhase }) {
  const [visionStep, setVisionStep] = useState(1);

  useEffect(() => {
    if (phase !== "analyzing") return;
    const id = window.setInterval(() => setVisionStep((s) => Math.min(3, s + 1)), 5000);
    return () => window.clearInterval(id);
  }, [phase]);

  const active =
    phase === "preparing"
      ? 0
      : phase === "analyzing"
        ? visionStep
        : phase === "interpreting"
          ? 4
          : 5;

  return (
    <div className="mx-auto max-w-md text-center">
      <div className="relative mx-auto w-48">
        <PalmIllustration className="h-auto w-full" />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden"
          aria-hidden="true"
        >
          <div className="h-1/4 w-full animate-scan bg-gradient-to-b from-transparent via-gold-300/25 to-transparent" />
        </div>
      </div>
      <h2 className="mt-6 text-2xl text-parchment" aria-live="polite">
        {STEPS[Math.min(active, STEPS.length - 1)]}…
      </h2>
      <ol className="mt-6 space-y-2 text-left" aria-label="Analysis progress">
        {STEPS.map((label, index) => {
          const state = index < active ? "done" : index === active ? "active" : "pending";
          return (
            <li
              key={label}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-colors",
                state === "active" && "bg-white/[0.05] text-parchment",
                state === "done" && "text-mist",
                state === "pending" && "text-mist-dim",
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs",
                  state === "done" && "border-gold-400/60 bg-gold-400/20 text-gold-200",
                  state === "active" && "border-gold-300 text-gold-200",
                  state === "pending" && "border-white/15",
                )}
                aria-hidden="true"
              >
                {state === "done" ? (
                  "✓"
                ) : state === "active" ? (
                  <span className="size-2 animate-pulse rounded-full bg-gold-300" />
                ) : (
                  index + 1
                )}
              </span>
              <span>
                {label}
                <span className="sr-only">
                  {state === "done" ? " (complete)" : state === "active" ? " (in progress)" : ""}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-6 text-xs leading-relaxed text-mist-dim">
        The AI examines your photo in a single pass, then a separate step writes the reading. These
        steps are an approximate guide — this usually takes under a minute.
      </p>
    </div>
  );
}
