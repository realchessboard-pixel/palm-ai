import { describe, expect, it } from "vitest";
import { availableFeatures } from "@/lib/palmistry/features";
import { composeRuleBasedReading, matchRules } from "@/lib/palmistry/interpretation";
import { sampleAnalysis } from "@/lib/palmistry/sample-analysis";
import { KNOWLEDGE_SOURCES, PARVATS, REKHAS } from "@/lib/palmistry/tradition";
import { groundInterpretation } from "@/lib/pipeline/grounding";
import { isUnsafeSentence, sanitizeInterpretation } from "@/lib/pipeline/safety";
import { narrativeFor } from "@/lib/readings/narrative-view";
import { projectInterpretation } from "@/lib/readings/projection";
import { resolveTranslation, sourceHash } from "@/lib/readings/translation-cache";
import { applyTexts, collectTexts } from "@/lib/readings/translation-texts";
import { AnalyzeFieldsSchema } from "@/lib/schemas/api";
import {
  GeneratedInterpretationSchema,
  PalmInterpretationSchema,
  toStoredInterpretation,
} from "@/lib/schemas/palm-interpretation";
import { buildAnalysisPrompt } from "@/prompts/palm-analysis";
import {
  INTERPRETATION_SYSTEM_PROMPT,
  buildInterpretationPrompt,
} from "@/prompts/palm-interpretation";
import { translationSystemPrompt } from "@/prompts/reading-translation";

const analysis = sampleAnalysis("right");
const reading = composeRuleBasedReading(analysis);

describe("traditional Indian palmistry layer", () => {
  it("names every mount as a parvat with its planet, and every line as a rekha", () => {
    expect(PARVATS.jupiter).toMatchObject({ name: "Guru Parvat", hindi: "गुरु पर्वत" });
    expect(PARVATS.venus.planet).toBe("Shukra (Venus)");
    expect(REKHAS.head).toEqual({ name: "Mastishka Rekha", hindi: "मस्तिष्क रेखा" });
    expect(Object.keys(PARVATS)).toHaveLength(7);
  });

  it("never claims a verified source it doesn't have", () => {
    for (const source of KNOWLEDGE_SOURCES) {
      if (source.kind === "curated-summary") expect(source.verified).toBe(false);
    }
    expect(matchRules(analysis).every((r) => r.source === "palmai-curated")).toBe(true);
  });

  it("builds a varied main reading from the palm's own features", () => {
    const n = reading.narrative!;
    expect(n.introduction.split("\n\n").length).toBeGreaterThanOrEqual(2);
    expect(n.introduction).toContain("Hasta Samudrika Shastra");
    expect(n.thinking?.basedOn).toContain("lines.head");
    expect(n.caring?.basedOn).toContain("lines.heart");
    expect(n.career?.text).not.toBe(n.thinking?.text);
    expect(new Set(n.strengths.map((s) => s.name)).size).toBe(n.strengths.length);
    expect(n.insight?.basedOn.length).toBeGreaterThanOrEqual(2);
    // A different palm gives a different reading.
    const other = sampleAnalysis("right");
    other.lines.head = {
      ...(other.lines.head as Exclude<typeof other.lines.head, string>),
      length: "short",
      curvature: "wide",
    };
    expect(composeRuleBasedReading(other).narrative!.thinking!.text).not.toBe(n.thinking!.text);
  });

  it("stores the generated reading with an overview derived from the narrative", () => {
    const { overview: _o, ...generated } = reading;
    void _o;
    const parsed = GeneratedInterpretationSchema.parse(generated);
    const stored = toStoredInterpretation(parsed);
    expect(stored.overview.headline).toBe(parsed.narrative.headline);
    expect(stored.overview.summary).toBe(parsed.narrative.introduction.split("\n\n")[0]);
    expect(PalmInterpretationSchema.safeParse(stored).success).toBe(true);
  });
});

describe("grounding and safety of the main reading", () => {
  it("removes sentences about parvats or rekhas that weren't seen, keeping paragraphs", () => {
    const partial = sampleAnalysis("right");
    partial.mounts.jupiter = "insufficient_visibility";
    partial.lines.fate = "insufficient_visibility";
    const written = composeRuleBasedReading(sampleAnalysis("right"));
    written.narrative!.introduction =
      "Your palm is open and clear.\n\nYour Guru Parvat is strong and full. Your Bhagya Rekha is deep. There is warmth here.";
    const grounded = groundInterpretation(written, partial);
    expect(grounded.interpretation.narrative!.introduction).toBe(
      "Your palm is open and clear.\n\nThere is warmth here.",
    );
    expect(grounded.removed).toBeGreaterThanOrEqual(2);
  });

  it("drops a passage whose citations were all unobserved", () => {
    const partial = sampleAnalysis("right");
    partial.lines.fate = "insufficient_visibility";
    const written = composeRuleBasedReading(sampleAnalysis("right"));
    written.narrative!.career = { text: "A steady working nature.", basedOn: ["lines.fate"] };
    expect(groundInterpretation(written, partial).interpretation.narrative!.career).toBeNull();
  });

  it("blocks fear-based astrology and remedies", () => {
    expect(isUnsafeSentence("A strong Mangal Parvat may indicate Mangal dosha.")).toBe(true);
    expect(isUnsafeSentence("Wearing a sapphire gemstone will balance Shani.")).toBe(true);
    expect(isUnsafeSentence("Traditionally, Shani Parvat is read as patience.")).toBe(false);
    const written = composeRuleBasedReading(analysis);
    written.narrative!.insight = {
      title: "Patience",
      text: "Traditionally this is read as patience. A simple remedy is to fast on Saturdays.",
      basedOn: ["lines.head"],
    };
    expect(sanitizeInterpretation(written).interpretation.narrative!.insight!.text).toBe(
      "Traditionally this is read as patience.",
    );
  });
});

describe("prompts", () => {
  const prompt = buildInterpretationPrompt({
    analysis,
    hand: "right",
    available: availableFeatures(analysis),
    rules: matchRules(analysis),
    sections: ["personality", "relationships"],
  });

  it("asks for a warm, personal, traditional Indian reading", () => {
    expect(INTERPRETATION_SYSTEM_PROMPT).toMatch(/Hasta Samudrika Shastra/);
    expect(INTERPRETATION_SYSTEM_PROMPT).toMatch(
      /Never mention AI[\s\S]*confidence[\s\S]*percentages/,
    );
    expect(INTERPRETATION_SYSTEM_PROMPT).toMatch(/Combine observations/);
    expect(prompt).toMatch(/"thinking" — The way you think/);
    expect(prompt).toMatch(/"insight" — Something interesting about you/);
    expect(prompt).toContain("Guru Parvat (Mount of Jupiter), ruled by Guru (Jupiter)");
  });

  it("forbids invented sources and misusing the Bhagavad Gita", () => {
    expect(INTERPRETATION_SYSTEM_PROMPT).toMatch(/Do not invent sources/);
    expect(INTERPRETATION_SYSTEM_PROMPT).toMatch(/never write Sanskrit verses/);
    expect(INTERPRETATION_SYSTEM_PROMPT).toMatch(/Bhagavad Gita is not a palmistry text/);
  });

  it("gives the model qualitative clarity, never raw confidence numbers, for features", () => {
    const features = prompt.slice(
      prompt.indexOf("AVAILABLE FEATURES"),
      prompt.indexOf("PARVATS SEEN"),
    );
    expect(features).toMatch(/lines\.head \(Head line \/ Mastishka Rekha\): (clear|softer)/);
    expect(features).not.toMatch(/0\.\d/);
  });

  it("tells both stages it is the right hand", () => {
    expect(prompt).toContain("HAND: the visitor's RIGHT hand");
    expect(buildAnalysisPrompt({ hand: "right" })).toMatch(
      /expected to show the user's RIGHT hand/,
    );
  });

  it("asks translators for natural language and Hindi terminology, with no new claims", () => {
    expect(translationSystemPrompt("hi")).toMatch(/हृदय रेखा[\s\S]*मस्तिष्क रेखा[\s\S]*गुरु पर्वत/);
    expect(translationSystemPrompt("de")).toMatch(/into German/);
    expect(translationSystemPrompt("ja")).toMatch(/Never translate word-for-word/);
    expect(translationSystemPrompt("es")).toMatch(/Do not add, remove or strengthen any claim/);
  });
});

describe("translation texts", () => {
  it("round-trips every text by stable id", () => {
    const texts = collectTexts(reading);
    expect(texts.get("narrative.thinking")).toBe(reading.narrative!.thinking!.text);
    expect([...texts.keys()].some((id) => id.startsWith("mounts."))).toBe(true);
    const marked = new Map([...texts].map(([id, t]) => [id, `«${t}»`]));
    const translated = applyTexts(reading, marked);
    for (const value of collectTexts(translated).values()) expect(value).toMatch(/^«[\s\S]*»$/);
    // Structure is untouched.
    expect(translated.narrative!.thinking!.basedOn).toEqual(reading.narrative!.thinking!.basedOn);
    expect(applyTexts(reading, new Map())).toEqual(reading);
  });

  it("free texts never include the detailed reading", () => {
    const free = collectTexts(projectInterpretation(reading, false).interpretation);
    expect(
      [...free.keys()].every((id) => id.startsWith("narrative.") || id.startsWith("overview.")),
    ).toBe(true);
  });

  it("re-translates text whose English source changed", () => {
    const source = new Map([["narrative.headline", "New headline"]]);
    const stale = { "narrative.headline": { t: "पुराना", h: sourceHash("Old headline") } };
    expect(resolveTranslation(source, stale).missing).toEqual(["narrative.headline"]);
    const fresh = { "narrative.headline": { t: "नया", h: sourceHash("New headline") } };
    expect(resolveTranslation(source, fresh).texts.get("narrative.headline")).toBe("नया");
  });
});

describe("older readings", () => {
  it("are presented in the same main-reading shape", () => {
    const { narrative: _n, ...legacy } = reading;
    void _n;
    const { narrative, usedSections } = narrativeFor(
      projectInterpretation(legacy, true).interpretation,
    );
    expect(narrative.headline).toBe(reading.overview.headline);
    expect(narrative.thinking?.text).toContain(
      reading.sections.find((s) => s.id === "personality")!.summary,
    );
    expect(usedSections).toEqual(expect.arrayContaining(["personality", "career"]));
  });
});

describe("right hand only", () => {
  it("stores every new reading as the right hand, whatever is sent", () => {
    for (const hand of ["left", "right", undefined]) {
      expect(AnalyzeFieldsSchema.parse({ hand, consent: "true" }).hand).toBe("right");
    }
  });
});
