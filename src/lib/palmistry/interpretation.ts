import {
  INSUFFICIENT,
  LINE_NAMES,
  MOUNT_NAMES,
  isObservedLine,
  type LineName,
  type LineObservation,
  type PalmAnalysis,
} from "@/lib/schemas/palm-analysis";
import {
  SECTION_TITLES,
  type LineReading,
  type MountReading,
  type PalmInterpretation,
  type ReadingSection,
  type SectionId,
} from "@/lib/schemas/palm-interpretation";
import { availableFeatures, featureLabel, lineLabel, type FeatureKey } from "./features";
import { FINGER_RULES, THUMB_RULES } from "./fingers";
import { ELEMENT_DESCRIPTIONS, ELEMENT_RULES, PALM_SHAPE_RULES, deriveElement } from "./handShapes";
import { LINE_RULES } from "./lines";
import { MARKING_CAVEAT, MARKING_MEANINGS } from "./markings";
import { MOUNT_RULES } from "./mounts";
import { CATEGORIES, type Category, type MatchedRule, type PalmistryRule } from "./types";

const LOW_CONFIDENCE = 0.6;

function match<T>(
  rules: PalmistryRule<T>[],
  observation: T,
  features: FeatureKey[],
  confidence: number,
): MatchedRule[] {
  return rules
    .filter((rule) => rule.appliesTo(observation))
    .map((rule) => ({
      id: rule.id,
      category: rule.category,
      trait: rule.trait,
      traditional: rule.traditional,
      explanation: rule.explanation,
      confidenceConsiderations: rule.confidenceConsiderations,
      shadow: rule.shadow,
      features,
      confidence,
    }));
}

/**
 * Match the knowledge base against the observed features. Only features that
 * pass the confidence threshold in `availableFeatures` are considered, so no
 * rule can fire for something the vision stage didn't report.
 */
export function matchRules(analysis: PalmAnalysis): MatchedRule[] {
  const available = availableFeatures(analysis);
  const matched: MatchedRule[] = [];

  for (const name of LINE_NAMES) {
    const key = `lines.${name}` as const;
    const line = analysis.lines[name];
    if (available.has(key) && isObservedLine(line)) {
      matched.push(...match(LINE_RULES[name], line, [key], available.get(key)!));
    }
  }

  for (const name of MOUNT_NAMES) {
    const key = `mounts.${name}` as const;
    const mount = analysis.mounts[name];
    if (available.has(key) && mount !== INSUFFICIENT) {
      matched.push(...match(MOUNT_RULES[name], mount.prominence, [key], available.get(key)!));
    }
  }

  const palm = analysis.palmShape;
  const fingers = analysis.fingers;
  if (available.has("palmShape") && palm !== INSUFFICIENT) {
    matched.push(...match(PALM_SHAPE_RULES, palm, ["palmShape"], available.get("palmShape")!));
  }
  if (available.has("fingers") && fingers !== INSUFFICIENT) {
    matched.push(...match(FINGER_RULES, fingers, ["fingers"], available.get("fingers")!));
    if (available.has("fingers.thumb") && fingers.thumb !== INSUFFICIENT) {
      matched.push(
        ...match(THUMB_RULES, fingers.thumb, ["fingers.thumb"], available.get("fingers.thumb")!),
      );
    }
    if (available.has("palmShape") && palm !== INSUFFICIENT) {
      const element = deriveElement(palm, fingers);
      if (element) {
        const confidence = Math.min(available.get("palmShape")!, available.get("fingers")!);
        matched.push(...match(ELEMENT_RULES, element, ["palmShape", "fingers"], confidence));
      }
    }
  }

  return matched.sort((a, b) => b.confidence - a.confidence);
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const unique = <T>(values: T[]) => [...new Set(values)];

function lowConfidenceNote(rules: MatchedRule[]): string | null {
  return rules.some((r) => r.confidence < LOW_CONFIDENCE)
    ? "Some of these features were detected with only moderate confidence, so treat them as lighter suggestions."
    : null;
}

function buildSection(
  id: SectionId,
  rules: MatchedRule[],
  analysis: PalmAnalysis,
): ReadingSection | null {
  const top = rules.slice(0, 4);
  if (top.length === 0) return null;
  const [first, ...rest] = top;
  const paragraphs = [
    first.explanation,
    ...rest.map((r) => `${r.traditional} ${r.explanation}`.trim()),
    lowConfidenceNote(top),
  ].filter(Boolean) as string[];
  const avg = top.reduce((sum, r) => sum + r.confidence, 0) / top.length;

  return {
    id,
    title: SECTION_TITLES[id],
    emphasis: Math.round(avg * 100),
    summary: first.traditional,
    details: paragraphs.join("\n\n"),
    points: unique(
      top.map((r) => `${capitalize(r.trait)} — ${featureLabel(r.features[0], analysis)}`),
    ).slice(0, 5),
    basedOn: unique(top.flatMap((r) => r.features)).slice(0, 8),
  };
}

const LENGTH_WORDS = { short: "short", medium: "medium-length", long: "long" } as const;
const CURVE_WORDS = {
  straight: "a straight course",
  slight: "a slight curve",
  moderate: "a moderate curve",
  wide: "a wide, sweeping curve",
} as const;
const DEPTH_WORDS = {
  faint: "faint",
  moderate: "moderately clear",
  deep: "deep and clear",
} as const;

/** Plain-language description of what was OBSERVED (no interpretation). */
export function describeLine(name: LineName, line: LineObservation): string {
  const parts: string[] = [];
  if (line.length) parts.push(LENGTH_WORDS[line.length]);
  const first = parts.length
    ? `Your ${lineLabel(name).toLowerCase()} appears ${parts.join(" ")}`
    : `Your ${lineLabel(name).toLowerCase()} is visible`;
  const extras: string[] = [];
  if (line.curvature) extras.push(`follows ${CURVE_WORDS[line.curvature]}`);
  if (line.depth) extras.push(`looks ${DEPTH_WORDS[line.depth]}`);
  if (line.breaks) extras.push("shows what looks like a break");
  if (line.forks.length)
    extras.push(line.forks.length === 1 ? "has a small fork" : "has small forks");
  const sentence = extras.length ? `${first}, ${extras.join(", ")}.` : `${first}.`;
  return sentence.replace(/\s+/g, " ");
}

function buildLineReadings(analysis: PalmAnalysis, matched: MatchedRule[]): LineReading[] {
  const readings: LineReading[] = [];
  for (const name of LINE_NAMES) {
    const key = `lines.${name}` as FeatureKey;
    const line = analysis.lines[name];
    const rules = matched.filter((r) => r.features.includes(key));
    if (!isObservedLine(line) || rules.length === 0) continue;
    const details = [
      ...rules.map((r) => `${r.traditional} ${r.explanation}`),
      rules[0].confidenceConsiderations,
    ];
    readings.push({
      line: name,
      summary: `${describeLine(name, line)} ${rules[0].traditional}`.slice(0, 500),
      details: details.join("\n\n").slice(0, 2000),
      basedOn: [key],
    });
  }
  return readings;
}

function buildMountReadings(analysis: PalmAnalysis, matched: MatchedRule[]): MountReading[] {
  return MOUNT_NAMES.flatMap((name) => {
    const key = `mounts.${name}` as FeatureKey;
    const rule = matched.find((r) => r.features.includes(key));
    if (!rule) return [];
    return [
      {
        mount: name,
        summary: rule.traditional,
        details: `${rule.explanation} ${rule.confidenceConsiderations}`,
        basedOn: [key],
      },
    ];
  });
}

function buildHighlights(analysis: PalmAnalysis, matched: MatchedRule[]): ReadingSection | null {
  const available = availableFeatures(analysis);
  const points: string[] = [];
  const basedOn: FeatureKey[] = [];
  const confidences: number[] = [];
  const paragraphs: string[] = [];

  const element = matched.find((r) => r.id.startsWith("element."));
  if (element) {
    points.push(
      capitalize(
        ELEMENT_DESCRIPTIONS[element.id.split(".")[1] as keyof typeof ELEMENT_DESCRIPTIONS].title,
      ),
    );
    paragraphs.push(`${element.traditional} ${element.explanation}`);
    basedOn.push(...element.features);
    confidences.push(element.confidence);
  }
  analysis.markings.forEach((marking, index) => {
    const key = `markings.${index}` as FeatureKey;
    if (!available.has(key)) return;
    points.push(`${capitalize(marking.type)} — ${marking.location}`.slice(0, 200));
    paragraphs.push(MARKING_MEANINGS[marking.type].traditional);
    basedOn.push(key);
    confidences.push(marking.confidence);
  });
  for (const name of LINE_NAMES) {
    const line = analysis.lines[name];
    const key = `lines.${name}` as FeatureKey;
    if (isObservedLine(line) && available.has(key) && line.forks.length > 0) {
      points.push(`Fork on the ${lineLabel(name).toLowerCase()}`);
      basedOn.push(key);
      confidences.push(available.get(key)!);
    }
  }
  if (basedOn.length === 0) return null;
  if (paragraphs.length === 0) {
    paragraphs.push(
      "Forks are traditionally read as a line's energy reaching in more than one direction.",
    );
  }
  if (analysis.markings.length) paragraphs.push(MARKING_CAVEAT);

  return {
    id: "highlights",
    title: SECTION_TITLES.highlights,
    emphasis: Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100),
    summary: paragraphs[0].slice(0, 500),
    details: paragraphs.join("\n\n").slice(0, 2500),
    points: unique(points).slice(0, 6),
    basedOn: unique(basedOn).slice(0, 8),
  };
}

function buildFingers(
  analysis: PalmAnalysis,
  matched: MatchedRule[],
): PalmInterpretation["fingers"] {
  const rules = matched.filter(
    (r) => r.features.includes("fingers") || r.features.includes("fingers.thumb"),
  );
  const relevant = rules.filter((r) => !r.id.startsWith("element."));
  if (relevant.length === 0) return null;
  return {
    summary: relevant[0].traditional,
    details: [
      ...relevant.slice(1).map((r) => r.traditional),
      relevant[0].confidenceConsiderations,
    ].join("\n\n"),
    basedOn: unique(relevant.flatMap((r) => r.features)),
  };
}

function buildMarkings(analysis: PalmAnalysis): PalmInterpretation["markings"] {
  const available = availableFeatures(analysis);
  const items = analysis.markings
    .map((marking, index) => ({ marking, key: `markings.${index}` as FeatureKey }))
    .filter(({ key }) => available.has(key));
  if (items.length === 0) return null;
  return {
    summary: `We noticed ${items.length === 1 ? "one minor marking" : `${items.length} minor markings`} that palmists traditionally pay attention to.`,
    details: [
      ...items.map(
        ({ marking }) =>
          `${capitalize(marking.type)} (${marking.location}): ${MARKING_MEANINGS[marking.type].traditional}`,
      ),
      MARKING_CAVEAT,
    ].join("\n\n"),
    basedOn: items.map(({ key }) => key),
  };
}

function buildOverview(
  analysis: PalmAnalysis,
  matched: MatchedRule[],
): PalmInterpretation["overview"] {
  const traits = unique(
    matched
      .filter(
        (r) =>
          ["personality", "strengths", "relationships"].includes(r.category) &&
          r.trait !== "balanced",
      )
      .map((r) => r.trait),
  ).slice(0, 2);
  const article = (word: string) => (/^[aeiou]/i.test(word) ? "an" : "a");
  const headline =
    traits.length === 2
      ? `${article(traits[0])} ${traits[0]}, ${traits[1]} palm`
      : traits.length === 1
        ? `${article(traits[0])} ${traits[0]} palm`
        : "Your palm, as traditional palmistry sees it";
  const linesSeen = LINE_NAMES.filter((n) => isObservedLine(analysis.lines[n])).length;
  return {
    headline: capitalize(headline),
    summary: `We could see ${linesSeen} of the 4 major lines clearly enough to interpret. Below is how traditional palmistry reads the features that were visible — offered as reflection and entertainment, not prediction.`,
  };
}

/**
 * Rules feeding a section. Challenges also draw on the traditional "flip side"
 * (shadow) of strongly observed traits, framed as areas for reflection.
 */
function rulesForCategory(matched: MatchedRule[], category: Category): MatchedRule[] {
  const direct = matched.filter((r) => r.category === category);
  if (category !== "challenges") return direct;
  const shadows = matched
    .filter((r) => r.shadow)
    .map((r) => ({
      ...r,
      category: "challenges" as const,
      trait: `flip side of being ${r.trait}`,
      traditional: r.shadow!,
      explanation: "",
    }));
  return [...direct, ...shadows].sort((a, b) => b.confidence - a.confidence);
}

/**
 * Deterministic reading built purely from the rule files. Used directly in
 * demo mode, and given to the language model as grounded source material.
 */
export function composeRuleBasedReading(analysis: PalmAnalysis): PalmInterpretation {
  const matched = matchRules(analysis);
  const sections: ReadingSection[] = [];
  for (const category of CATEGORIES) {
    const section = buildSection(
      category as Category,
      rulesForCategory(matched, category),
      analysis,
    );
    if (section) sections.push(section);
  }
  const highlights = buildHighlights(analysis, matched);
  if (highlights) sections.push(highlights);

  return {
    overview: buildOverview(analysis, matched),
    sections,
    lines: buildLineReadings(analysis, matched),
    mounts: buildMountReadings(analysis, matched),
    fingers: buildFingers(analysis, matched),
    markings: buildMarkings(analysis),
  };
}
