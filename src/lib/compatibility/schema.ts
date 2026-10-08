import { z } from "zod";
import { FEATURE_KEY_PATTERN } from "@/lib/palmistry/features";

/**
 * A couple reading: two right palms read side by side. Citations name whose
 * palm a feature is from ("you." or "partner." + a feature key), so passages
 * about features nobody showed are removed, exactly as in a single reading.
 */
export const COMPATIBILITY_PART_IDS = ["minds", "hearts", "everyday", "growth"] as const;
export type CompatibilityPartId = (typeof COMPATIBILITY_PART_IDS)[number];

export const COMPATIBILITY_PART_TITLES: Record<CompatibilityPartId, string> = {
  minds: "How you think together",
  hearts: "How you care for each other",
  everyday: "Your everyday rhythm",
  growth: "How you grow as a pair",
};

const CITATION = new RegExp(`^(you|partner)\\.(${FEATURE_KEY_PATTERN.source.slice(1, -1)})$`);
const Citation = z.string().regex(CITATION, "Unknown citation");
const BasedOn = z.array(Citation).min(1).max(8);

export const CompatibilityReadingSchema = z.object({
  headline: z.string().min(1).max(140),
  /** 2–3 paragraphs separated by blank lines. */
  introduction: z.string().min(1).max(2200),
  parts: z
    .array(
      z.object({
        id: z.enum(COMPATIBILITY_PART_IDS),
        text: z.string().min(1).max(1800),
        basedOn: BasedOn,
      }),
    )
    .max(COMPATIBILITY_PART_IDS.length),
  strengths: z
    .array(
      z.object({
        name: z.string().min(1).max(40),
        text: z.string().min(1).max(400),
        basedOn: BasedOn,
      }),
    )
    .max(5),
  /** Gentle: where to give each other room. Never a warning. */
  reflection: z
    .object({
      title: z.string().min(1).max(120),
      text: z.string().min(1).max(1500),
      basedOn: BasedOn,
    })
    .nullable(),
});
export type CompatibilityReading = z.infer<typeof CompatibilityReadingSchema>;

/** What the model must write (at least two parts and three strengths). */
export const GeneratedCompatibilitySchema = CompatibilityReadingSchema.extend({
  parts: CompatibilityReadingSchema.shape.parts.min(2),
  strengths: CompatibilityReadingSchema.shape.strengths.min(3),
});
