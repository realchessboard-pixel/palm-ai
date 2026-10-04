import type { LineName } from "@/lib/schemas/palm-analysis";
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
  hand: "left" | "right";
  status: ReadingStatusView;
  createdAt: string;
  isDemo: boolean;
  hasImage: boolean;
  /** 0–1 confidence in the IMAGE ANALYSIS, not in any palmistry claim. */
  analysisConfidence: number | null;
  rejectionReason: string | null;
  premium: boolean;
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
