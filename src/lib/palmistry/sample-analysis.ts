import type { PalmAnalysis } from "@/lib/schemas/palm-analysis";

/**
 * A fixed, realistic example of stage-1 output. Used by the `mock` AI
 * provider (clearly labelled as demo data in the UI) and by tests.
 * It is NOT derived from any user's photo.
 */
export function sampleAnalysis(hand: "left" | "right" = "right"): PalmAnalysis {
  return {
    hand,
    imageQuality: {
      score: 0.86,
      usable: true,
      palmVisible: true,
      palmVisibilityConfidence: 0.93,
      issues: [],
    },
    palmShape: { proportion: "rectangular", widthToLength: "balanced", confidence: 0.78 },
    fingers: {
      relativeLength: "long",
      spacing: "moderate",
      indexVsRing: "ring_longer",
      thumb: { size: "medium", setting: "medium", angle: "wide", confidence: 0.7 },
      confidence: 0.74,
    },
    lines: {
      heart: {
        visible: true,
        confidence: 0.88,
        length: "long",
        curvature: "moderate",
        depth: "deep",
        breaks: false,
        forks: [
          { location: "end", description: "Small fork near the end, below the index finger" },
        ],
        intersections: [],
        markings: [],
        path: {
          description:
            "Starts at the outer edge below the little finger and curves up toward the index finger",
          points: [
            { x: 0.8, y: 0.47 },
            { x: 0.62, y: 0.45 },
            { x: 0.45, y: 0.44 },
            { x: 0.33, y: 0.4 },
          ],
          pointsConfidence: 0.62,
        },
      },
      head: {
        visible: true,
        confidence: 0.84,
        length: "long",
        curvature: "slight",
        depth: "moderate",
        breaks: false,
        forks: [],
        intersections: ["Joins the life line at its start"],
        markings: [],
        path: {
          description:
            "Begins joined to the life line and runs across the palm with a gentle downward slope",
          points: [
            { x: 0.25, y: 0.55 },
            { x: 0.42, y: 0.57 },
            { x: 0.58, y: 0.6 },
            { x: 0.72, y: 0.64 },
          ],
          pointsConfidence: 0.6,
        },
      },
      life: {
        visible: true,
        confidence: 0.81,
        length: "long",
        curvature: "wide",
        depth: "moderate",
        breaks: false,
        forks: [],
        intersections: [],
        markings: [],
        path: {
          description: "Sweeps in a wide arc around the base of the thumb toward the wrist",
          points: [
            { x: 0.26, y: 0.56 },
            { x: 0.36, y: 0.68 },
            { x: 0.37, y: 0.8 },
            { x: 0.36, y: 0.92 },
          ],
          pointsConfidence: 0.58,
        },
      },
      fate: {
        visible: true,
        confidence: 0.52,
        length: "medium",
        curvature: "straight",
        depth: "faint",
        breaks: true,
        forks: [],
        intersections: ["Crosses the head line"],
        markings: [],
        path: null,
      },
    },
    mounts: {
      venus: { prominence: "prominent", confidence: 0.72 },
      jupiter: { prominence: "moderate", confidence: 0.6 },
      saturn: { prominence: "flat", confidence: 0.48 },
      apollo: { prominence: "moderate", confidence: 0.55 },
      mercury: { prominence: "moderate", confidence: 0.5 },
      mars: "insufficient_visibility",
      moon: { prominence: "moderate", confidence: 0.57 },
    },
    markings: [
      {
        type: "triangle",
        location: "Center of the palm, between head and heart lines",
        confidence: 0.41,
      },
    ],
    overallConfidence: 0.79,
  };
}
