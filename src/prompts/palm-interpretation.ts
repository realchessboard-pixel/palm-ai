import { z } from "zod";
import { featureLabel, type FeatureKey } from "@/lib/palmistry/features";
import { COMBINATIONS, PARVATS, REKHAS } from "@/lib/palmistry/tradition";
import type { MatchedRule } from "@/lib/palmistry/types";
import { LINE_NAMES, MOUNT_NAMES, type PalmAnalysis } from "@/lib/schemas/palm-analysis";
import {
  GeneratedDetailedSchema,
  GeneratedTeaserSchema,
  SECTION_TITLES,
  type ReadingNarrative,
  type SectionId,
} from "@/lib/schemas/palm-interpretation";

/**
 * Stage 2 prompt: write a reading from STRUCTURED OBSERVATIONS ONLY. The
 * model never sees the photo here, so it cannot introduce visual details that
 * stage 1 didn't report.
 */
export const INTERPRETATION_PROMPT_VERSION = "palm-interpretation/2026-10-05-main";
export const DETAILED_PROMPT_VERSION = "palm-detailed/2026-10-05";

export const INTERPRETATION_SYSTEM_PROMPT = `You are an experienced, warm palm reader trained in traditional Indian palmistry — Hasta Samudrika Shastra, part of Samudrika Shastra. You have looked carefully at the visitor's right palm and are now explaining, in person, what you see and what tradition says it means.

VOICE
- Speak directly to the visitor ("you", "your palm") like a thoughtful reader sitting across from them: personal, warm, calm, a little intriguing, never theatrical.
- Write flowing prose with natural transitions, as someone who has spent time with this palm. Connect observations to each other; do not write a checklist.
- Use traditional Indian terms where they help — Guru Parvat (the Mount of Jupiter), Shukra Parvat (Venus), Shani Parvat (Saturn), Surya Parvat (Sun), Budha Parvat (Mercury), Chandra Parvat (Moon), Mangal Parvat (Mars), and the rekhas (Hridaya Rekha for the heart line, Mastishka Rekha for the head line, Jeevan Rekha for the life line, Bhagya Rekha for the fate line). Always make the meaning clear, and don't overload the reader: a few well-placed terms are better than many.
- Never mention AI, models, analysis, detection, confidence, percentages, scores, "classification" or "features detected". Never write "based on" in the text. Simply say what you see and what tradition reads in it. Where a feature is faint or less certain, soften the wording ("there is a hint of…", "this may suggest…") instead of giving a number.
- Plain, elegant English. No emojis, no markdown, no bullet characters inside text.

GROUNDING
- Use ONLY the observed features listed under AVAILABLE FEATURES and the traditional notes supplied. Never describe a line, mount or marking that is missing, not visible or marked insufficient_visibility.
- Every passage cites the feature keys it draws on in "basedOn", using only keys from AVAILABLE FEATURES.
- Combine observations. A meaningful conclusion should draw on two or more features together (for example head line with hand shape, heart line with Shukra Parvat, fate line with Shani and Guru Parvat). Never build a big conclusion on one faint feature.

TRADITION AND HONESTY
- Present every interpretation as tradition, not fact: "In Samudrika Shastra this is often read as…", "Traditionally…", "One traditional interpretation is…". Never claim palmistry is scientifically proven.
- Do not invent sources. Never name or quote a book, author, verse, shloka, page or scripture as saying something, and never write Sanskrit verses. Refer only to "traditional Indian palmistry", "Hasta Samudrika Shastra" or "Samudrika Shastra" in general.
- The Bhagavad Gita is not a palmistry text. Never attribute a palm interpretation to it. At most, where it genuinely fits, you may echo a broad Indian philosophical idea — self-knowledge, steady action without anxiety about results, balance — without quoting or citing it.

SAFETY
- Never predict events, dates, ages, marriage, divorce, children or deaths. Never make claims about lifespan, health, illness, pregnancy, fertility, legal outcomes, or guaranteed money, wealth or success. No doshas, remedies, gemstones, rituals or fear-based warnings (including about Shani or Mangal).
- Challenges are framed gently, as areas for reflection. Stay positive without flattery.

Return valid JSON matching the supplied schema. Output only the JSON object.`;

const NARRATIVE_SCHEMA_JSON = JSON.stringify(
  z.toJSONSchema(GeneratedTeaserSchema, { unrepresentable: "any" }),
);
const DETAILED_SCHEMA_JSON = JSON.stringify(
  z.toJSONSchema(GeneratedDetailedSchema, { unrepresentable: "any" }),
);

function withoutPathPoints(lines: PalmAnalysis["lines"]) {
  return Object.fromEntries(
    Object.entries(lines).map(([name, line]) => [
      name,
      typeof line === "string" || !line.path
        ? line
        : { ...line, path: { description: line.path.description } },
    ]),
  );
}

function noteFor(r: MatchedRule): string {
  return `- (${r.features.join(", ")}; ${r.confidence < 0.6 ? "softer feature" : "clear feature"}) ${r.traditional} ${r.explanation}${r.shadow ? ` Gentle reflection: ${r.shadow}` : ""}`;
}

interface PromptInput {
  analysis: PalmAnalysis;
  /** The hand the reading is for (PalmAI reads the right hand). */
  hand: "left" | "right";
  available: Map<FeatureKey, number>;
  rules: MatchedRule[];
}

/** What both prompts share: the observations, the citable keys and the parvats. */
function observationContext(input: PromptInput): string {
  const features = [...input.available.entries()]
    .map(([key, confidence]) => {
      const label = featureLabel(key, input.analysis);
      const [group, name] = key.split(".");
      const indian =
        group === "lines" && (LINE_NAMES as readonly string[]).includes(name)
          ? ` / ${REKHAS[name as keyof typeof REKHAS].name}`
          : group === "mounts" && (MOUNT_NAMES as readonly string[]).includes(name)
            ? ` / ${PARVATS[name as keyof typeof PARVATS].name}`
            : "";
      return `- ${key} (${label}${indian}): ${confidence >= 0.6 ? "clear" : "softer"}`;
    })
    .join("\n");

  const mounts = MOUNT_NAMES.filter((m) => input.available.has(`mounts.${m}`))
    .map(
      (m) =>
        `- ${PARVATS[m].name} (${PARVATS[m].western}), ruled by ${PARVATS[m].planet}: ${PARVATS[m].themes}`,
    )
    .join("\n");

  // Overlay coordinates only drive the diagram, so they are left out to keep the
  // prompt lean. The reading is always for the stored hand, never the model's guess.
  const analysisForPrompt = {
    ...input.analysis,
    lines: withoutPathPoints(input.analysis.lines),
    hand: input.hand,
    handConfidence: undefined,
  };

  return `HAND: the visitor's ${input.hand.toUpperCase()} hand. If you mention which hand, it is the ${input.hand} hand.

OBSERVED PALM FEATURES (JSON):
${JSON.stringify(analysisForPrompt)}

AVAILABLE FEATURES (the ONLY keys you may cite in basedOn, and the only features you may discuss):
${features}

PARVATS SEEN IN THIS PALM (traditional planetary associations):
${mounts || "- none clearly seen"}`;
}

function allNotes(rules: MatchedRule[]): string {
  return rules.map((r) => `- [${r.category}] ${noteFor(r).slice(2)}`).join("\n");
}

/** The free reading: one short section, to keep the cost of a free reading low. */
export function buildInterpretationPrompt(input: PromptInput): string {
  const keys = new Set<string>(COMBINATIONS.thinking.features);
  const relevant = input.rules.filter((r) => r.features.some((f) => keys.has(f)));
  return `${observationContext(input)}

WRITE A SHORT FIRST READING (the rest of the reading is written later)
- "headline": one evocative, personal line drawn from this palm (not a prediction).
- "introduction": 2 short paragraphs separated by a blank line: what stands out first in this hand, and a sentence that this is traditional palmistry, offered for reflection. About 90 words.
- "thinking": "The way you think" — ${COMBINATIONS.thinking.guide} About 110 words, citing AVAILABLE FEATURES in "basedOn".

TRADITIONAL NOTES FOR THIS PART:
${relevant.length ? relevant.map(noteFor).join("\n") : allNotes(input.rules)}

JSON schema:
${NARRATIVE_SCHEMA_JSON}`;
}

/** Plain text of the main reading, so the detailed reading can build on it without repeating it. */
function narrativeText(n: ReadingNarrative): string {
  return [
    n.headline,
    n.introduction,
    n.thinking?.text,
    n.caring?.text,
    ...n.strengths.map((s) => `${s.name}: ${s.text}`),
    n.career?.text,
    n.insight ? `${n.insight.title}: ${n.insight.text}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** The detailed reading, written after it is unlocked. */
export function buildDetailedPrompt(
  input: PromptInput & { sections: SectionId[]; narrative: ReadingNarrative | null },
): string {
  const sectionList = input.sections.map((id) => `- ${id}: "${SECTION_TITLES[id]}"`).join("\n");

  return `${observationContext(input)}

TRADITIONAL NOTES (all matched interpretations — your source material):
${allNotes(input.rules)}
${
  input.narrative
    ? `
THE MAIN READING YOU ALREADY GAVE THIS VISITOR (stay consistent with it; go deeper rather than repeating it):
"""
${narrativeText(input.narrative)}
"""
`
    : ""
}
DETAILED READING (same voice, more extensive; it complements the main reading rather than repeating it)
Write these sections, in this order:
${sectionList}
- Each section: a one-sentence "summary", 2–4 paragraphs of "details", up to 4 short "points", and "basedOn". Set "emphasis" to null.
- "lines": one entry per line in AVAILABLE FEATURES (none for others), naming it with its rekha.
- "mounts": one entry per mount in AVAILABLE FEATURES (none for others), naming it as a parvat and its ruling planet.
- "fingers": only if "fingers" or "fingers.thumb" is available, otherwise null. Read the thumb (angushtha) for willpower and reasoning, and the fingers for temperament.
- "markings": only if a "markings.N" key is available, otherwise null.

JSON schema:
${DETAILED_SCHEMA_JSON}`;
}
