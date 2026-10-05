import { z } from "zod";
import { FEATURE_KEY_PATTERN } from "@/lib/palmistry/features";
import { LINE_NAMES, MOUNT_NAMES } from "@/lib/schemas/palm-analysis";

/**
 * Stage 2 output: a reading written ONLY from the stage 1 observations.
 * Every section cites the features it is based on (`basedOn`); the pipeline
 * removes anything citing features that were not observed.
 */
export const INTERPRETATION_SCHEMA_VERSION = 2;

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

/** One passage of the main reading, written as a palm reader speaking to the visitor. */
const PassageSchema = z.object({
  text: z.string().min(1).max(1800),
  basedOn: BasedOn,
});
export type ReadingPassage = z.infer<typeof PassageSchema>;

export const StrengthSchema = z.object({
  name: z.string().min(1).max(40),
  text: z.string().min(1).max(450),
  basedOn: BasedOn,
});
export type ReadingStrength = z.infer<typeof StrengthSchema>;

/**
 * Schema v2: the main, human-style reading (headline, introduction, "the way
 * you think", "the way you care", strengths, career nature and one
 * interesting insight). Optional so v1 readings stored without it stay valid.
 */
export const ReadingNarrativeSchema = z.object({
  headline: z.string().min(1).max(140),
  /** 2–3 paragraphs separated by blank lines. */
  introduction: z.string().min(1).max(2200),
  thinking: PassageSchema.nullable(),
  caring: PassageSchema.nullable(),
  strengths: z.array(StrengthSchema).max(6),
  career: PassageSchema.nullable(),
  insight: PassageSchema.extend({ title: z.string().min(1).max(120) }).nullable(),
});
export type ReadingNarrative = z.infer<typeof ReadingNarrativeSchema>;

const InterpretationBody = {
  sections: z.array(ReadingSectionSchema).max(SECTION_IDS.length),
  lines: z.array(LineReadingSchema).max(LINE_NAMES.length),
  mounts: z.array(MountReadingSchema).max(MOUNT_NAMES.length),
  fingers: NarrativeSchema.nullable(),
  markings: NarrativeSchema.nullable(),
};

function checkUnique(
  value: {
    sections: { id: string }[];
    lines: { line: string }[];
    mounts: { mount: string }[];
  },
  ctx: z.RefinementCtx,
) {
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
}

/** What is stored and served. `overview` is kept for lists and older readings. */
export const PalmInterpretationSchema = z
  .object({
    overview: z.object({
      headline: z.string().min(1).max(140),
      summary: z.string().min(1).max(700),
    }),
    narrative: ReadingNarrativeSchema.optional(),
    ...InterpretationBody,
    /**
     * True while only the main reading exists: the detailed reading (sections,
     * lines, mounts, fingers, markings) is written after it is unlocked, so a
     * free reading doesn't pay for content nobody may read. Absent = complete.
     */
    detailedPending: z.boolean().optional(),
  })
  .superRefine(checkUnique);

export type PalmInterpretation = z.infer<typeof PalmInterpretationSchema>;

/** What the model writes for the free reading: the main reading only. */
export const GeneratedNarrativeSchema = z.object({
  narrative: ReadingNarrativeSchema.extend({
    strengths: z.array(StrengthSchema).min(3).max(6),
  }),
});
export type GeneratedNarrative = z.infer<typeof GeneratedNarrativeSchema>;

/** What the model writes once the detailed reading is unlocked. */
export const GeneratedDetailedSchema = z
  .object({
    ...InterpretationBody,
    sections: z.array(ReadingSectionSchema).min(1).max(SECTION_IDS.length),
  })
  .superRefine(checkUnique);
export type GeneratedDetailed = z.infer<typeof GeneratedDetailedSchema>;

/** First paragraph of the introduction, trimmed to fit the overview summary. */
function firstParagraph(text: string): string {
  const paragraph = text.split(/\n{2,}/)[0]!.trim();
  if (paragraph.length <= 700) return paragraph;
  const cut = paragraph.slice(0, 699);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 600))}…`;
}

/**
 * Stored form of a freshly written main reading. The overview is derived from
 * the narrative, so the model isn't asked to write the same thing twice. With
 * no detailed content yet, the reading is marked `detailedPending`.
 */
export function toStoredInterpretation(
  generated: GeneratedNarrative & Partial<GeneratedDetailed>,
): PalmInterpretation {
  const { narrative, ...detailed } = generated;
  const overview = {
    headline: narrative.headline,
    summary: firstParagraph(narrative.introduction),
  };
  if (!detailed.sections) {
    return {
      overview,
      narrative,
      sections: [],
      lines: [],
      mounts: [],
      fingers: null,
      markings: null,
      detailedPending: true,
    };
  }
  return {
    overview,
    narrative,
    sections: detailed.sections,
    lines: detailed.lines ?? [],
    mounts: detailed.mounts ?? [],
    fingers: detailed.fingers ?? null,
    markings: detailed.markings ?? null,
  };
}
