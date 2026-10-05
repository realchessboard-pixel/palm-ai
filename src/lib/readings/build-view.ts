import { availableFeatures, featureLabel } from "@/lib/palmistry/features";
import { composeRuleBasedReading } from "@/lib/palmistry/interpretation";
import { INSUFFICIENT, LINE_NAMES, type PalmAnalysis } from "@/lib/schemas/palm-analysis";
import { DEFAULT_LANGUAGE, type Language } from "@/lib/i18n/languages";
import type { PaymentState } from "@/lib/payments/states";
import type { PalmInterpretation } from "@/lib/schemas/palm-interpretation";
import { assessHandSide } from "./hand-side";
import { projectInterpretation, type LockedContent } from "./projection";
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
  paymentState?: PaymentState;
  language?: Language;
  translationPending?: boolean;
}): ReadingView {
  const { reading, analysis, interpretation, premium } = input;
  const projected = interpretation ? projectInterpretation(interpretation, premium) : null;
  const detailedPending = interpretation?.detailedPending === true;
  // Before purchase the detailed reading isn't written yet: describe what it will cover
  // from the observed features instead.
  const locked =
    projected?.locked && detailedPending && analysis
      ? plannedDetailedContent(analysis)
      : (projected?.locked ?? null);
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
    language: input.language ?? DEFAULT_LANGUAGE,
    translationPending: input.translationPending ?? false,
    detailedPending: premium && detailedPending,
    // An entitlement (from a verified payment) is what unlocks; show it as paid even if the
    // latest checkout attempt was abandoned.
    paymentState: premium ? "PAYMENT_SUCCESS" : unlockedStateGuard(input.paymentState),
    lines: analysis ? lineObservations(analysis) : [],
    features,
    interpretation: projected?.interpretation ?? null,
    locked,
  };
}

/** What the detailed reading will contain for this palm (same plan the writer follows). */
export function plannedDetailedContent(analysis: PalmAnalysis): LockedContent {
  const available = availableFeatures(analysis);
  const has = (prefix: string) => [...available.keys()].some((k) => k.startsWith(prefix));
  return {
    sections: composeRuleBasedReading(analysis).sections.map((s) => s.id),
    lines: LINE_NAMES.filter((l) => available.has(`lines.${l}`)),
    mountCount: [...available.keys()].filter((k) => k.startsWith("mounts.")).length,
    fingers: has("fingers"),
    markings: has("markings."),
    detailedSections: [],
  };
}

/** Without an entitlement a reading is never shown as paid, whatever the payment rows say. */
function unlockedStateGuard(state: PaymentState | undefined): PaymentState {
  return !state || state === "PAYMENT_SUCCESS" ? "UNPAID" : state;
}
