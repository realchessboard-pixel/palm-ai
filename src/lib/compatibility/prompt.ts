import { z } from "zod";
import { featureLabel, type FeatureKey } from "@/lib/palmistry/features";
import { PARVATS, REKHAS } from "@/lib/palmistry/tradition";
import type { MatchedRule } from "@/lib/palmistry/types";
import { LINE_NAMES, MOUNT_NAMES, type PalmAnalysis } from "@/lib/schemas/palm-analysis";
import { COMPATIBILITY_PART_TITLES, GeneratedCompatibilitySchema } from "./schema";

export const COMPATIBILITY_PROMPT_VERSION = "palm-compatibility/2026-10-05";

export const COMPATIBILITY_SYSTEM_PROMPT = `You are an experienced, warm palm reader trained in traditional Indian palmistry (Hasta Samudrika Shastra). A couple has shown you both of their right palms, and you are now telling them, together, what tradition reads in their two hands side by side.

VOICE
- Speak to both of them ("you" for the person who asked, "your partner" for the other; "the two of you" together). Warm, light, personal and respectful — like a reader at a family gathering, never theatrical.
- Flowing prose that connects observations from BOTH palms. Use a few traditional terms (Hridaya Rekha, Mastishka Rekha, Shukra Parvat, Guru Parvat…) and make their meaning clear.
- Never mention AI, analysis, detection, confidence, scores or percentages. No "match percentage" or ratings of the couple.

WHAT THIS IS
- A reflection on how two temperaments may complement each other, according to tradition. Celebrate differences as balance; frame contrasts as things to understand, never as problems.
- It is NOT kundli or guna matching, and you must never compare it to them or give any score.

GROUNDING
- Use ONLY the features listed for each person. Cite them in "basedOn" as "you.<key>" or "partner.<key>" using only the listed keys. Never describe a feature that is not listed.
- Each part should draw on both palms where possible.

SAFETY
- Never predict marriage, engagement, break-ups, separation, divorce, children, pregnancy, health, lifespan, money or any event or date. Never say they are or are not "meant to be", destined, or a good or bad match.
- No doshas (including Mangal dosha), remedies, gemstones, rituals or fear-based warnings.
- Present everything as tradition ("traditionally…", "in Samudrika Shastra this is often read as…"). Do not invent sources or quote any text or verse.

Return valid JSON matching the supplied schema. Output only the JSON object.`;

const SCHEMA_JSON = JSON.stringify(
  z.toJSONSchema(GeneratedCompatibilitySchema, { unrepresentable: "any" }),
);

function featureList(
  who: "you" | "partner",
  analysis: PalmAnalysis,
  available: Map<FeatureKey, number>,
): string {
  return [...available.entries()]
    .map(([key, confidence]) => {
      const [group, name] = key.split(".");
      const indian =
        group === "lines" && (LINE_NAMES as readonly string[]).includes(name)
          ? ` / ${REKHAS[name as keyof typeof REKHAS].name}`
          : group === "mounts" && (MOUNT_NAMES as readonly string[]).includes(name)
            ? ` / ${PARVATS[name as keyof typeof PARVATS].name}`
            : "";
      return `- ${who}.${key} (${featureLabel(key, analysis)}${indian}): ${confidence >= 0.6 ? "clear" : "softer"}`;
    })
    .join("\n");
}

function notes(rules: MatchedRule[]): string {
  return rules
    .filter((r) => ["personality", "relationships", "strengths", "challenges"].includes(r.category))
    .map(
      (r) =>
        `- (${r.features.join(", ")}) ${r.traditional}${r.shadow ? ` Reflection: ${r.shadow}` : ""}`,
    )
    .join("\n");
}

function observations(analysis: PalmAnalysis) {
  const lines = Object.fromEntries(
    Object.entries(analysis.lines).map(([name, line]) => [
      name,
      typeof line === "string" || !line.path
        ? line
        : { ...line, path: { description: line.path.description } },
    ]),
  );
  return JSON.stringify({ ...analysis, lines, hand: "right", handConfidence: undefined });
}

export function buildCompatibilityPrompt(input: {
  you: { analysis: PalmAnalysis; available: Map<FeatureKey, number>; rules: MatchedRule[] };
  partner: { analysis: PalmAnalysis; available: Map<FeatureKey, number>; rules: MatchedRule[] };
}): string {
  const parts = Object.entries(COMPATIBILITY_PART_TITLES)
    .map(([id, title]) => `- "${id}": ${title}`)
    .join("\n");
  return `YOUR PALM (right hand) — observations:
${observations(input.you.analysis)}

YOUR FEATURES (cite as you.<key>):
${featureList("you", input.you.analysis, input.you.available)}

TRADITIONAL NOTES FOR YOUR PALM:
${notes(input.you.rules)}

YOUR PARTNER'S PALM (right hand) — observations:
${observations(input.partner.analysis)}

YOUR PARTNER'S FEATURES (cite as partner.<key>):
${featureList("partner", input.partner.analysis, input.partner.available)}

TRADITIONAL NOTES FOR YOUR PARTNER'S PALM:
${notes(input.partner.rules)}

WRITE
- "headline": one warm line about the two of you (not a prediction).
- "introduction": 2–3 short paragraphs separated by a blank line: what you notice first about the two palms together, and that this is traditional palmistry offered for reflection.
- "parts": one or two paragraphs each, for as many of these as the features support:
${parts}
- "strengths": 3–5 strengths of the two of you together (a 1–3 word name and 1–2 sentences each).
- "reflection": where the two of you might give each other room — gentle and practical, with a short title; null if nothing fits.

JSON schema:
${SCHEMA_JSON}`;
}
