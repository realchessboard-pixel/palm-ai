import type { PalmAnalysis } from "@/lib/schemas/palm-analysis";

/**
 * Hand-side policy: the hand the USER selected is canonical. The vision
 * model's guess is only a check signal; it never changes the stored hand or
 * the reading. A strong disagreement just asks the user to confirm the photo.
 */
export type HandSide = "left" | "right";

/** Model confidence at or above which a disagreement is shown to the user. */
export const STRONG_HAND_MISMATCH_CONFIDENCE = 0.7;

export interface HandSideCheck {
  /** Always the user's selection. */
  canonical: HandSide;
  /** What the vision model reported (check signal only). */
  detected: HandSide | "unknown";
  /** Model confidence in `detected`, when it reported one. */
  detectedConfidence: number | null;
  /** The model named the other hand. */
  mismatch: boolean;
  /** The model named the other hand confidently: ask the user to confirm the photo. */
  strongMismatch: boolean;
}

export function assessHandSide(
  selected: HandSide,
  analysis: Pick<PalmAnalysis, "hand" | "handConfidence">,
): HandSideCheck {
  const detected = analysis.hand;
  const confidence = analysis.handConfidence ?? null;
  const mismatch = detected !== "unknown" && detected !== selected;
  // Analyses stored before handConfidence existed carry a definite left/right
  // with no confidence; treat that as a confident claim so the user is asked.
  const strongMismatch =
    mismatch && (confidence === null || confidence >= STRONG_HAND_MISMATCH_CONFIDENCE);
  return {
    canonical: selected,
    detected,
    detectedConfidence: confidence,
    mismatch,
    strongMismatch,
  };
}
