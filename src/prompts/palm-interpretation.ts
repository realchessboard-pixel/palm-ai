import { z } from "zod";
import { featureLabel, type FeatureKey } from "@/lib/palmistry/features";
import type { MatchedRule } from "@/lib/palmistry/types";
import type { PalmAnalysis } from "@/lib/schemas/palm-analysis";
import {
  PalmInterpretationSchema,
  SECTION_TITLES,
  type SectionId,
} from "@/lib/schemas/palm-interpretation";

/**
 * Stage 2 prompt: write a reading from STRUCTURED OBSERVATIONS ONLY. The
 * model never sees the photo here, so it cannot introduce visual details that
 * stage 1 didn't report.
 */
export const INTERPRETATION_PROMPT_VERSION = "palm-interpretation/2026-10-01";

export const INTERPRETATION_SYSTEM_PROMPT = `You write thoughtful, warm palm readings for an entertainment and personal-reflection app.

Rules:
- Use the supplied observable features. They come from an earlier image-analysis step; you do not see the photo.
- Do not introduce visual features absent from the analysis. Only discuss lines, mounts, finger traits and markings listed under AVAILABLE FEATURES. Never mention a feature that is missing, not visible, or marked insufficient_visibility.
- Every section must cite the feature keys it is based on in "basedOn", using only keys from AVAILABLE FEATURES.
- Describe interpretations as traditional palmistry beliefs ("Traditional palmistry associates…", "Palmists often read…"). Do not present palmistry as scientifically validated.
- Never predict events, dates or ages. Never make claims about death, lifespan, illness, health conditions, pregnancy, fertility, criminality, legal outcomes, or guaranteed money, wealth or success.
- No fear-based or manipulative language. Challenges are framed gently, as areas for reflection.
- Lower-confidence features deserve softer, more tentative wording.
- Write in second person, in clear, elegant plain English. No emojis, no markdown.
- Return valid JSON matching the supplied schema. Output only the JSON object.`;

const SCHEMA_JSON = JSON.stringify(
  z.toJSONSchema(PalmInterpretationSchema, { unrepresentable: "any" }),
);

export function buildInterpretationPrompt(input: {
  analysis: PalmAnalysis;
  available: Map<FeatureKey, number>;
  rules: MatchedRule[];
  sections: SectionId[];
}): string {
  const features = [...input.available.entries()]
    .map(
      ([key, confidence]) =>
        `- ${key} (${featureLabel(key, input.analysis)}), confidence ${confidence.toFixed(2)}`,
    )
    .join("\n");

  const notes = input.rules
    .map(
      (r) =>
        `- [${r.category}] based on ${r.features.join(", ")} (confidence ${r.confidence.toFixed(2)}): ${r.traditional} ${r.explanation} Caveat: ${r.confidenceConsiderations}`,
    )
    .join("\n");

  const sectionList = input.sections.map((id) => `- ${id}: "${SECTION_TITLES[id]}"`).join("\n");

  return `OBSERVED PALM FEATURES (stage 1 output, JSON):
${JSON.stringify(input.analysis)}

AVAILABLE FEATURES (the ONLY keys you may cite in basedOn, and the only features you may discuss):
${features}

TRADITIONAL PALMISTRY NOTES matched to these features (use them as your source material):
${notes}

Write these sections, in this order, each grounded in the notes above:
${sectionList}

Also write:
- "lines": one entry per line that appears in AVAILABLE FEATURES (none for others).
- "mounts": one entry per mount that appears in AVAILABLE FEATURES (none for others).
- "fingers": only if "fingers" or "fingers.thumb" is available, otherwise null.
- "markings": only if a "markings.N" key is available, otherwise null.
- "emphasis" (0–100): how strongly the cited features speak to the section's theme, scaled by their confidence. It is NOT a probability or accuracy score.
- "overview.headline": a short, evocative but non-predictive title. "overview.summary": 2–3 sentences, ending with a reminder that this is traditional palmistry for reflection.

JSON schema:
${SCHEMA_JSON}`;
}
