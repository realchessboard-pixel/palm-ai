import { z } from "zod";
import { featureLabel, type FeatureKey } from "@/lib/palmistry/features";
import { COMBINATIONS, PARVATS, REKHAS, type NarrativePart } from "@/lib/palmistry/tradition";
import type { MatchedRule } from "@/lib/palmistry/types";
import { LINE_NAMES, MOUNT_NAMES, type PalmAnalysis } from "@/lib/schemas/palm-analysis";
import {
  GeneratedInterpretationSchema,
  SECTION_TITLES,
  type SectionId,
} from "@/lib/schemas/palm-interpretation";

/**
 * Stage 2 prompt: write a reading from STRUCTURED OBSERVATIONS ONLY. The
 * model never sees the photo here, so it cannot introduce visual details that
 * stage 1 didn't report.
 */
export const INTERPRETATION_PROMPT_VERSION = "palm-interpretation/2026-10-05-samudrika";

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

const SCHEMA_JSON = JSON.stringify(
  z.toJSONSchema(GeneratedInterpretationSchema, { unrepresentable: "any" }),
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

const PART_TITLES: Record<NarrativePart, string> = {
  thinking: '"thinking" — The way you think',
  caring: '"caring" — The way you care',
  career: '"career" — Your career nature',
};

export function buildInterpretationPrompt(input: {
  analysis: PalmAnalysis;
  /** The hand the reading is for (PalmAI reads the right hand). */
  hand: "left" | "right";
  available: Map<FeatureKey, number>;
  rules: MatchedRule[];
  sections: SectionId[];
}): string {
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

  // Group the traditional notes by the part of the reading they serve.
  const plan = (Object.keys(COMBINATIONS) as NarrativePart[])
    .map((part) => {
      const keys = new Set<string>(COMBINATIONS[part].features);
      const relevant = input.rules.filter((r) => r.features.some((f) => keys.has(f)));
      return `${PART_TITLES[part]}\n${COMBINATIONS[part].guide}\n${relevant.length ? relevant.map(noteFor).join("\n") : "- (no relevant features were observed: set this to null)"}`;
    })
    .join("\n\n");

  const mounts = MOUNT_NAMES.filter((m) => input.available.has(`mounts.${m}`))
    .map(
      (m) =>
        `- ${PARVATS[m].name} (${PARVATS[m].western}), ruled by ${PARVATS[m].planet}: ${PARVATS[m].themes}`,
    )
    .join("\n");

  const allNotes = input.rules.map((r) => `- [${r.category}] ${noteFor(r).slice(2)}`).join("\n");
  const sectionList = input.sections.map((id) => `- ${id}: "${SECTION_TITLES[id]}"`).join("\n");

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
${mounts || "- none clearly seen"}

PLAN FOR THE MAIN READING ("narrative")
- "headline": one evocative, personal line drawn from this palm (not a prediction), e.g. "A thoughtful mind with a quietly independent nature" — but write your own.
- "introduction": 2–3 short paragraphs separated by a blank line. Open as a reader who has just studied the palm: what stands out first, the overall character of the hand, and a sentence that this is traditional palmistry, offered for reflection.

${plan}

"strengths" — Your natural strengths: 4–6 strengths that genuinely follow from THIS palm's features (each a 1–3 word name and 1–2 sentences). Vary them; don't default to a stock list.

"insight" — Something interesting about you: the most engaging part. Find a real tension or balance between two or more observations (logic and emotion, independence and loyalty, curiosity and discipline, ambition and patience…) and explain it warmly in one or two paragraphs. Give it a short title.

TRADITIONAL NOTES (all matched interpretations — your source material):
${allNotes}

DETAILED READING (same voice, more extensive; it complements the main reading rather than repeating it)
Write these sections, in this order:
${sectionList}
- Each section: a one-sentence "summary", 2–4 paragraphs of "details", up to 4 short "points", and "basedOn". Set "emphasis" to null.
- "lines": one entry per line in AVAILABLE FEATURES (none for others), naming it with its rekha.
- "mounts": one entry per mount in AVAILABLE FEATURES (none for others), naming it as a parvat and its ruling planet.
- "fingers": only if "fingers" or "fingers.thumb" is available, otherwise null. Read the thumb (angushtha) for willpower and reasoning, and the fingers for temperament.
- "markings": only if a "markings.N" key is available, otherwise null.

JSON schema:
${SCHEMA_JSON}`;
}
