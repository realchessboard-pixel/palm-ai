import type { LineName } from "@/lib/schemas/palm-analysis";
import type { HandSideCheck } from "@/lib/readings/hand-side";
import type { Language } from "@/lib/i18n/languages";
import type { PaymentState } from "@/lib/payments/states";
import type { LockedContent, ProjectedInterpretation } from "@/lib/readings/projection";

/** Client-safe shape of a reading as returned by GET /api/readings/[id]. */

export type ReadingStatusView =
  "PENDING" | "ANALYZING" | "ANALYZED" | "INTERPRETING" | "COMPLETE" | "REJECTED" | "FAILED";

export interface LineObservationView {
  line: LineName;
  state: "observed" | "not_visible" | "insufficient_visibility";
  confidence: number | null;
  length: string | null;
  curvature: string | null;
  depth: string | null;
  breaks: boolean | null;
  forkCount: number;
  /** Approximate normalised points, only present when the model was reasonably confident. */
  approximatePath: { x: number; y: number }[] | null;
}

export interface FeatureView {
  key: string;
  label: string;
  confidence: number;
}

export interface ReadingView {
  id: string;
  /** Canonical hand side: always the user's selection. */
  hand: "left" | "right";
  /** Comparison with the vision model's hand-side guess (check signal only). */
  handCheck: HandSideCheck | null;
  status: ReadingStatusView;
  createdAt: string;
  isDemo: boolean;
  hasImage: boolean;
  /** 0–1 confidence in the IMAGE ANALYSIS, not in any palmistry claim. */
  analysisConfidence: number | null;
  rejectionReason: string | null;
  premium: boolean;
  /** Language the reading text is shown in (English is the original). */
  language: Language;
  /** True while some visible text has no translation yet (English is shown meanwhile). */
  translationPending: boolean;
  /** Display only — access is decided server-side by the entitlement. */
  paymentState: PaymentState;
  lines: LineObservationView[];
  features: FeatureView[];
  interpretation: ProjectedInterpretation | null;
  locked: LockedContent | null;
}

export interface ReadingListItem {
  id: string;
  hand: "left" | "right";
  status: ReadingStatusView;
  createdAt: string;
  hasImage: boolean;
  premium: boolean;
  headline: string | null;
}
