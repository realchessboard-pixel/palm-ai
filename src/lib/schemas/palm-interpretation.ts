import { z } from "zod";
import { FEATURE_KEY_PATTERN } from "@/lib/palmistry/features";
import { LINE_NAMES, MOUNT_NAMES } from "@/lib/schemas/palm-analysis";

/**
 * Stage 2 output: a reading written ONLY from the stage 1 observations.
 * Every section cites the features it is based on (`basedOn`); the pipeline
 * removes anything citing features that were not observed.
 */
export const INTERPRETATION_SCHEMA_VERSION = 1;

export const SECTION_IDS = [
  "personality",
  "relationships",
  "career",
  "money",
  "lifePath",
  "strengths",
  "challenges",
  "highlights",
] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export const SECTION_TITLES: Record<SectionId, string> = {
  personality: "Personality",
  relationships: "Love & Relationships",
  career: "Career",
  money: "Money & Success",
  lifePath: "Life Path",
  strengths: "Strengths",
  challenges: "Challenges",
  highlights: "Traditional Palmistry Highlights",
};

const FeatureKeySchema = z.string().regex(FEATURE_KEY_PATTERN, "Unknown feature key");
const BasedOn = z.array(FeatureKeySchema).min(1).max(8);

export const ReadingSectionSchema = z.object({
  id: z.enum(SECTION_IDS),
  title: z.string().min(1).max(80),
  /**
   * 0–100: how strongly the observed features speak to this theme, weighted
   * by detection confidence. NOT a probability that anything is true.
   */
  emphasis: z.number().int().min(0).max(100).nullable(),
  summary: z.string().min(1).max(500),
  details: z.string().min(1).max(2500),
  points: z.array(z.string().min(1).max(200)).max(6),
  basedOn: BasedOn,
});
export type ReadingSection = z.infer<typeof ReadingSectionSchema>;

export const LineReadingSchema = z.object({
  line: z.enum(LINE_NAMES),
  summary: z.string().min(1).max(500),
  details: z.string().min(1).max(2000),
  basedOn: BasedOn,
});
export type LineReading = z.infer<typeof LineReadingSchema>;

export const MountReadingSchema = z.object({
  mount: z.enum(MOUNT_NAMES),
  summary: z.string().min(1).max(400),
  details: z.string().min(1).max(1500),
  basedOn: BasedOn,
});
export type MountReading = z.infer<typeof MountReadingSchema>;

const NarrativeSchema = z.object({
  summary: z.string().min(1).max(500),
  details: z.string().min(1).max(2000),
  basedOn: BasedOn,
});

export const PalmInterpretationSchema = z
  .object({
    overview: z.object({
      headline: z.string().min(1).max(140),
      summary: z.string().min(1).max(700),
    }),
    sections: z.array(ReadingSectionSchema).min(1).max(SECTION_IDS.length),
    lines: z.array(LineReadingSchema).max(LINE_NAMES.length),
    mounts: z.array(MountReadingSchema).max(MOUNT_NAMES.length),
    fingers: NarrativeSchema.nullable(),
    markings: NarrativeSchema.nullable(),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>();
    for (const section of value.sections) {
      if (seen.has(section.id)) {
        ctx.addIssue({ code: "custom", message: `Duplicate section: ${section.id}` });
      }
      seen.add(section.id);
    }
    const lines = new Set<string>();
    for (const line of value.lines) {
      if (lines.has(line.line))
        ctx.addIssue({ code: "custom", message: `Duplicate line: ${line.line}` });
      lines.add(line.line);
    }
    const mounts = new Set<string>();
    for (const mount of value.mounts) {
      if (mounts.has(mount.mount)) {
        ctx.addIssue({ code: "custom", message: `Duplicate mount: ${mount.mount}` });
      }
      mounts.add(mount.mount);
    }
  });

export type PalmInterpretation = z.infer<typeof PalmInterpretationSchema>;
