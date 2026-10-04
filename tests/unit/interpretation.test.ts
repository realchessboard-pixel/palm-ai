import { describe, expect, it } from "vitest";
import { availableFeatures } from "@/lib/palmistry/features";
import { composeRuleBasedReading, describeLine, matchRules } from "@/lib/palmistry/interpretation";
import { LINE_RULES } from "@/lib/palmistry/lines";
import { MOUNT_RULES } from "@/lib/palmistry/mounts";
import { sampleAnalysis } from "@/lib/palmistry/sample-analysis";
import { groundInterpretation } from "@/lib/pipeline/grounding";
import { finalizeInterpretation } from "@/lib/pipeline/interpret";
import { isUnsafeSentence, sanitizeInterpretation, sanitizeText } from "@/lib/pipeline/safety";
import { INSUFFICIENT, type PalmAnalysis } from "@/lib/schemas/palm-analysis";
import { PalmInterpretationSchema } from "@/lib/schemas/palm-interpretation";

function analysisWithoutFate(): PalmAnalysis {
  const a = structuredClone(sampleAnalysis());
  a.lines.fate = INSUFFICIENT;
  a.mounts.saturn = INSUFFICIENT;
  a.markings = [];
  return a;
}

describe("palmistry rules engine", () => {
  it("produces a schema-valid reading from the sample analysis", () => {
    const reading = composeRuleBasedReading(sampleAnalysis());
    expect(PalmInterpretationSchema.safeParse(reading).success).toBe(true);
    expect(reading.sections.map((s) => s.id)).toEqual(
      expect.arrayContaining(["personality", "relationships", "career"]),
    );
  });

  it("only cites features that were observed", () => {
    const analysis = analysisWithoutFate();
    const available = availableFeatures(analysis);
    const reading = composeRuleBasedReading(analysis);
    const cited = [
      ...reading.sections.flatMap((s) => s.basedOn),
      ...reading.lines.flatMap((l) => l.basedOn),
      ...reading.mounts.flatMap((m) => m.basedOn),
    ];
    expect(cited.every((k) => available.has(k as never))).toBe(true);
    expect(reading.lines.map((l) => l.line)).not.toContain("fate");
    expect(reading.mounts.map((m) => m.mount)).not.toContain("saturn");
    expect(reading.markings).toBeNull();
  });

  it("ignores features below the confidence threshold", () => {
    const analysis = structuredClone(sampleAnalysis());
    (analysis.lines.fate as { confidence: number }).confidence = 0.2;
    expect(matchRules(analysis).some((r) => r.features.includes("lines.fate"))).toBe(false);
  });

  it("never fires a rule when nothing is visible", () => {
    const analysis = structuredClone(sampleAnalysis());
    analysis.palmShape = INSUFFICIENT;
    analysis.fingers = INSUFFICIENT;
    for (const k of Object.keys(analysis.lines) as (keyof typeof analysis.lines)[])
      analysis.lines[k] = INSUFFICIENT;
    for (const k of Object.keys(analysis.mounts) as (keyof typeof analysis.mounts)[])
      analysis.mounts[k] = INSUFFICIENT;
    analysis.markings = [];
    expect(matchRules(analysis)).toEqual([]);
  });

  it("knowledge-base wording passes the safety filter untouched", () => {
    const texts = [
      ...Object.values(LINE_RULES).flat(),
      ...Object.values(MOUNT_RULES).flat(),
    ].flatMap((r) => [r.traditional, r.explanation, r.confidenceConsiderations, r.shadow ?? ""]);
    const unsafe = texts.filter((t) => sanitizeText(t).removed > 0);
    expect(unsafe).toEqual([]);
    expect(sanitizeInterpretation(composeRuleBasedReading(sampleAnalysis())).removed).toBe(0);
  });

  it("describes observations in plain language", () => {
    const heart = sampleAnalysis().lines.heart;
    if (heart === INSUFFICIENT) throw new Error("fixture");
    expect(describeLine("heart", heart)).toBe(
      "Your heart line appears long, follows a moderate curve, looks deep and clear, has a small fork.",
    );
  });
});

describe("safety filter", () => {
  it.each([
    "Your life line shows you will die young.",
    "This suggests a risk of heart disease.",
    "You may become pregnant soon.",
    "You will become rich at age 37.",
    "Expect to win the lottery in 2030.",
    "This line guarantees success.",
    "Your health line shows problems with your liver.",
    "You are destined to marry twice.",
    "This marking suggests criminal tendencies.",
  ])("blocks: %s", (sentence) => {
    expect(isUnsafeSentence(sentence)).toBe(true);
  });

  it.each([
    "Traditional palmistry associates this curve with warmth.",
    "Palmists stress that the life line says nothing about lifespan.",
    "This is never a guarantee of any outcome.",
    "Palmistry is not scientifically validated.",
  ])("allows: %s", (sentence) => {
    expect(isUnsafeSentence(sentence)).toBe(false);
  });

  it("removes only the offending sentence", () => {
    const { text, removed } = sanitizeText(
      "Your heart line is long. You will die at 80. Palmists read it as warmth.",
    );
    expect(removed).toBe(1);
    expect(text).toBe("Your heart line is long. Palmists read it as warmth.");
  });
});

describe("grounding filter", () => {
  it("strips citations, items and sentences about unobserved features", () => {
    const analysis = analysisWithoutFate();
    const full = composeRuleBasedReading(sampleAnalysis());
    // Simulate a model that hallucinated the fate line and Mount of Saturn.
    full.sections[0] = {
      ...full.sections[0],
      summary: `${full.sections[0].summary} Your fate line also shows ambition.`,
      basedOn: [...full.sections[0].basedOn, "lines.fate"],
    };
    const { interpretation, removed, invalidCitations } = groundInterpretation(full, analysis);
    expect(removed).toBeGreaterThan(0);
    expect(invalidCitations).toBeGreaterThan(0);
    const text = JSON.stringify(interpretation);
    expect(text).not.toMatch(/fate line/i);
    expect(text).not.toMatch(/"lines\.fate"/);
    expect(interpretation.lines.map((l) => l.line)).not.toContain("fate");
    expect(interpretation.mounts.map((m) => m.mount)).not.toContain("saturn");
    expect(interpretation.markings).toBeNull();
  });

  it("finalizeInterpretation returns a valid, safe, grounded reading", () => {
    const analysis = analysisWithoutFate();
    const raw = composeRuleBasedReading(sampleAnalysis());
    raw.overview.summary = "You will die rich. This reading reflects traditional palmistry.";
    const { interpretation } = finalizeInterpretation(raw, analysis);
    expect(PalmInterpretationSchema.safeParse(interpretation).success).toBe(true);
    expect(interpretation.overview.summary).not.toMatch(/die/);
  });
});
