import { z } from "zod";

/**
 * Stage 1 output: OBSERVABLE palm features only.
 *
 * The vision model must use `"insufficient_visibility"` instead of guessing,
 * and a line that is not visible may not carry any attribute details. These
 * rules are enforced here so that a model that "invents" detail is rejected
 * before anything is saved.
 */
export const ANALYSIS_SCHEMA_VERSION = 1;

export const INSUFFICIENT = "insufficient_visibility" as const;
const Insufficient = z.literal(INSUFFICIENT);

export const Confidence = z.number().min(0).max(1);

export const LINE_NAMES = ["life", "head", "heart", "fate"] as const;
export type LineName = (typeof LINE_NAMES)[number];

export const MOUNT_NAMES = [
  "venus",
  "jupiter",
  "saturn",
  "apollo",
  "mercury",
  "mars",
  "moon",
] as const;
export type MountName = (typeof MOUNT_NAMES)[number];

export const MARKING_TYPES = [
  "star",
  "cross",
  "island",
  "triangle",
  "square",
  "grille",
  "chain",
  "trident",
] as const;
export type MarkingType = (typeof MARKING_TYPES)[number];

export const IMAGE_ISSUES = [
  "too_dark",
  "overexposed",
  "blurry",
  "partial_palm",
  "palm_not_found",
  "back_of_hand",
  "obstructed",
  "too_far",
  "glare",
  "low_resolution",
] as const;

/** Normalised (0–1) image coordinate. Only used for clearly-labelled approximate overlays. */
export const Point = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) });

export const LinePath = z.object({
  description: z.string().max(240),
  points: z.array(Point).min(2).max(12).nullable(),
  pointsConfidence: Confidence,
});

export const LineObservationSchema = z
  .object({
    visible: z.boolean(),
    confidence: Confidence,
    length: z.enum(["short", "medium", "long"]).nullable(),
    curvature: z.enum(["straight", "slight", "moderate", "wide"]).nullable(),
    depth: z.enum(["faint", "moderate", "deep"]).nullable(),
    breaks: z.boolean().nullable(),
    forks: z
      .array(
        z.object({
          location: z.enum(["start", "middle", "end"]),
          description: z.string().max(200),
        }),
      )
      .max(5),
    intersections: z.array(z.string().max(120)).max(6),
    markings: z.array(z.enum(MARKING_TYPES)).max(6),
    path: LinePath.nullable(),
  })
  .superRefine((line, ctx) => {
    if (line.visible) return;
    const invented =
      line.length !== null ||
      line.curvature !== null ||
      line.depth !== null ||
      line.breaks !== null ||
      line.forks.length > 0 ||
      line.intersections.length > 0 ||
      line.markings.length > 0 ||
      line.path !== null;
    if (invented) {
      ctx.addIssue({
        code: "custom",
        message: "A line marked not visible must not include any attribute details.",
      });
    }
  });
export type LineObservation = z.infer<typeof LineObservationSchema>;

export const LineSchema = z.union([Insufficient, LineObservationSchema]);
export type LineResult = z.infer<typeof LineSchema>;

export const MountObservationSchema = z.object({
  prominence: z.enum(["flat", "moderate", "prominent"]),
  confidence: Confidence,
});
export const MountSchema = z.union([Insufficient, MountObservationSchema]);
export type MountResult = z.infer<typeof MountSchema>;

export const ThumbSchema = z.union([
  Insufficient,
  z.object({
    size: z.enum(["small", "medium", "large"]),
    setting: z.enum(["low", "medium", "high"]),
    angle: z.enum(["narrow", "moderate", "wide"]),
    confidence: Confidence,
  }),
]);

export const FingersSchema = z.union([
  Insufficient,
  z.object({
    relativeLength: z.enum(["short", "medium", "long"]),
    spacing: z.enum(["close", "moderate", "wide"]),
    indexVsRing: z.enum(["index_longer", "similar", "ring_longer", "unclear"]),
    thumb: ThumbSchema,
    confidence: Confidence,
  }),
]);
export type FingersResult = z.infer<typeof FingersSchema>;

export const PalmShapeSchema = z.union([
  Insufficient,
  z.object({
    proportion: z.enum(["square", "rectangular"]),
    widthToLength: z.enum(["wide", "balanced", "narrow"]),
    confidence: Confidence,
  }),
]);
export type PalmShapeResult = z.infer<typeof PalmShapeSchema>;

export const MarkingSchema = z.object({
  type: z.enum(MARKING_TYPES),
  location: z.string().min(1).max(80),
  confidence: Confidence,
});
export type Marking = z.infer<typeof MarkingSchema>;

export const PalmAnalysisSchema = z.object({
  hand: z.enum(["left", "right", "unknown"]),
  imageQuality: z.object({
    score: Confidence,
    usable: z.boolean(),
    palmVisible: z.boolean(),
    palmVisibilityConfidence: Confidence,
    issues: z.array(z.enum(IMAGE_ISSUES)).max(IMAGE_ISSUES.length),
  }),
  palmShape: PalmShapeSchema,
  fingers: FingersSchema,
  lines: z.object({
    life: LineSchema,
    head: LineSchema,
    heart: LineSchema,
    fate: LineSchema,
  }),
  mounts: z.object({
    venus: MountSchema,
    jupiter: MountSchema,
    saturn: MountSchema,
    apollo: MountSchema,
    mercury: MountSchema,
    mars: MountSchema,
    moon: MountSchema,
  }),
  markings: z.array(MarkingSchema).max(10),
  overallConfidence: Confidence,
});

export type PalmAnalysis = z.infer<typeof PalmAnalysisSchema>;

export function isObservedLine(line: LineResult): line is LineObservation {
  return line !== INSUFFICIENT && line.visible;
}
