import { z } from "zod";
import { PalmAnalysisSchema } from "@/lib/schemas/palm-analysis";

/**
 * Stage 1 prompt: observable feature extraction ONLY. No interpretation,
 * no predictions. Bump the version whenever the wording changes so stored
 * analyses can be traced to the prompt that produced them.
 */
export const ANALYSIS_PROMPT_VERSION = "palm-analysis/2026-10-05-right-hand";

export const ANALYSIS_SYSTEM_PROMPT = `You are analyzing a photograph for traditional palmistry feature extraction.

Your job is to OBSERVE and RECORD, not to interpret or predict.

Rules:
- You must only report features that are reasonably visible in the photograph.
- Do not infer hidden lines. If a line cannot be seen, mark it "visible": false with every attribute null and every list empty.
- If the image does not show an area well enough to judge (cropped, blurred, in shadow, covered), use the string "insufficient_visibility" for that feature instead of guessing.
- Every observation carries a confidence between 0 and 1 reflecting how clearly you can see it. Be conservative: faint or ambiguous features get low confidence.
- Do not make medical, legal, financial, or guaranteed future predictions. Do not comment on health, age, identity, ethnicity or skin conditions.
- If the photo does not show the palm side of a human hand, set imageQuality.palmVisible to false and imageQuality.usable to false.
- Return valid JSON matching the supplied schema. Output only the JSON object.`;

const SCHEMA_JSON = JSON.stringify(z.toJSONSchema(PalmAnalysisSchema, { unrepresentable: "any" }));

export function buildAnalysisPrompt(input: { hand: "left" | "right" }): string {
  const expected =
    input.hand === "right"
      ? "AstroVidya reads the RIGHT hand only, and the user was asked to photograph their RIGHT palm, so this image is expected to show the user's RIGHT hand."
      : "The user says this is a photo of their LEFT hand.";
  return `${expected} That is authoritative; "hand" is only your independent check. Report which hand you believe is shown, and set "handConfidence" honestly. Hand side is easy to misjudge: selfie cameras often mirror photos, and the thumb's side depends on whether the palm faces the camera. Use "unknown" or a low confidence when unsure.

Field guidance:
- imageQuality.score: overall suitability of the photo for reading palm lines (0–1).
- imageQuality.usable: false if the palm lines cannot reasonably be examined.
- imageQuality.issues: any of the listed issue codes that apply.
- palmShape.proportion: "square" if palm width is close to its length (wrist to finger base), "rectangular" if clearly longer than wide.
- fingers.relativeLength: finger length relative to palm length. indexVsRing compares index and ring finger tips; use "unclear" if you can't tell.
- lines.*: the four major lines.
  - heart: across the upper palm below the fingers.
  - head: across the middle of the palm, often starting near the life line.
  - life: arcing around the base of the thumb.
  - fate: running vertically up the center of the palm toward the middle finger (often faint or absent).
  For each visible line give length, curvature, depth (how clearly etched), breaks, forks, intersections and minor markings on it.
- path.points: OPTIONAL approximate positions as fractions of image width (x) and height (y), origin at the top-left of the image. Every x and y is a decimal from 0 to 1 (e.g. 0.42), never a pixel value. Only include points when you can locate the line confidently; otherwise set points to null. Set pointsConfidence honestly.
- mounts.*: the fleshy pads (Venus at thumb base, Jupiter under index, Saturn under middle, Apollo under ring, Mercury under little finger, Mars on the palm edges between Jupiter/Venus and Mercury/Moon, Moon on the outer palm above the wrist). Mounts are hard to judge in a flat photo — use "insufficient_visibility" or low confidence when unsure.
- markings: only distinct stars, crosses, islands, triangles, squares, grilles, chains or tridents you can actually see, with a short location description.
- overallConfidence: your overall confidence in these observations.

JSON schema:
${SCHEMA_JSON}`;
}
