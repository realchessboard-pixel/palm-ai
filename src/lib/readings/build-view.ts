import { availableFeatures, featureLabel } from "@/lib/palmistry/features";
import { INSUFFICIENT, LINE_NAMES, type PalmAnalysis } from "@/lib/schemas/palm-analysis";
import type { PalmInterpretation } from "@/lib/schemas/palm-interpretation";
import { assessHandSide } from "./hand-side";
import { projectInterpretation } from "./projection";
import type { LineObservationView, ReadingStatusView, ReadingView } from "./view";

/** Minimum model confidence before we draw approximate line positions on a photo. */
export const OVERLAY_MIN_CONFIDENCE = 0.5;

export interface ReadingRecordLike {
  id: string;
  hand: "LEFT" | "RIGHT";
  status: ReadingStatusView;
  createdAt: Date;
  isDemo: boolean;
  imageKey: string | null;
  analysisConfidence: number | null;
  rejectionReason: string | null;
}

export function lineObservations(analysis: PalmAnalysis): LineObservationView[] {
  return LINE_NAMES.map((name) => {
    const line = analysis.lines[name];
    if (line === INSUFFICIENT) {
      return {
        line: name,
        state: "insufficient_visibility",
        confidence: null,
        length: null,
        curvature: null,
        depth: null,
        breaks: null,
        forkCount: 0,
        approximatePath: null,
      };
    }
    const points =
      line.visible && line.path?.points && line.path.pointsConfidence >= OVERLAY_MIN_CONFIDENCE
        ? line.path.points
        : null;
    return {
      line: name,
      state: line.visible ? "observed" : "not_visible",
      confidence: line.confidence,
      length: line.length,
      curvature: line.curvature,
      depth: line.depth,
      breaks: line.breaks,
      forkCount: line.forks.length,
      approximatePath: points,
    };
  });
}

/** Assemble the client-safe view, applying the entitlement projection. */
export function buildReadingView(input: {
  reading: ReadingRecordLike;
  analysis: PalmAnalysis | null;
  interpretation: PalmInterpretation | null;
  premium: boolean;
}): ReadingView {
  const { reading, analysis, interpretation, premium } = input;
  const projected = interpretation ? projectInterpretation(interpretation, premium) : null;
  const features = analysis
    ? [...availableFeatures(analysis).entries()]
        .map(([key, confidence]) => ({ key, label: featureLabel(key, analysis), confidence }))
        .sort((a, b) => b.confidence - a.confidence)
    : [];

  // The stored selection is canonical; the model's guess is only compared against it.
  const hand = reading.hand === "LEFT" ? "left" : "right";

  return {
    id: reading.id,
    hand,
    handCheck: analysis ? assessHandSide(hand, analysis) : null,
    status: reading.status,
    createdAt: reading.createdAt.toISOString(),
    isDemo: reading.isDemo,
    hasImage: reading.imageKey !== null,
    analysisConfidence: reading.analysisConfidence,
    rejectionReason: reading.rejectionReason,
    premium,
    lines: analysis ? lineObservations(analysis) : [],
    features,
    interpretation: projected?.interpretation ?? null,
    locked: projected?.locked ?? null,
  };
}
