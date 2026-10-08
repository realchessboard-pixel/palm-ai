import { PalmIllustration } from "@/components/palm/palm-illustration";
import { cn } from "@/lib/cn";

/** Real pipeline boundaries: upload → vision analysis → (on the results page) interpretation. */
export type PipelinePhase = "preparing" | "analyzing" | "analyzed";

export const PROGRESS_STEPS = [
  "Examining your palm",
  "Identifying major lines",
  "Reading palm features",
  "Preparing your interpretation",
] as const;

type StepState = "pending" | "active" | "done";

/**
 * Progress display driven only by real events. The first three steps happen in
 * one AI pass over the photo, so they are shown in progress together and
 * complete together when that pass returns — nothing is advanced on a timer.
 */
function stepStates(phase: PipelinePhase): StepState[] {
  switch (phase) {
    case "preparing":
      return ["active", "pending", "pending", "pending"];
    case "analyzing":
      return ["active", "active", "active", "pending"];
    case "analyzed":
      return ["done", "done", "done", "active"];
  }
}

export function AnalysisProgress({ phase }: { phase: PipelinePhase }) {
  const states = stepStates(phase);
  const heading = phase === "analyzed" ? PROGRESS_STEPS[3] : PROGRESS_STEPS[0];

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
        {heading}…
      </h2>
      <ol className="mt-6 space-y-2 text-left" aria-label="Analysis progress">
        {PROGRESS_STEPS.map((label, index) => {
          const state = states[index]!;
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
        We examine your photo in a single pass, so the first three steps finish together. Your palm
        map appears as soon as they do, while your interpretation is written.
      </p>
    </div>
  );
}
