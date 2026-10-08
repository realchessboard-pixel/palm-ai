import { describe, expect, it } from "vitest";
import { availableFeatures } from "@/lib/palmistry/features";
import { composeRuleBasedReading, matchRules } from "@/lib/palmistry/interpretation";
import { sampleAnalysis } from "@/lib/palmistry/sample-analysis";
import { buildReadingView } from "@/lib/readings/build-view";
import { assessHandSide } from "@/lib/readings/hand-side";
import { PalmAnalysisSchema, type PalmAnalysis } from "@/lib/schemas/palm-analysis";
import { buildInterpretationPrompt } from "@/prompts/palm-interpretation";

/** A Gemini-style analysis of a right palm that the model labelled LEFT. */
function analysisSaying(hand: PalmAnalysis["hand"], handConfidence?: number): PalmAnalysis {
  return { ...sampleAnalysis("right"), hand, handConfidence };
}

describe("hand-side policy", () => {
  it("selected RIGHT, model says LEFT → canonical stays RIGHT and the user is asked to confirm", () => {
    const check = assessHandSide("right", analysisSaying("left", 0.92));
    expect(check).toEqual({
      canonical: "right",
      detected: "left",
      detectedConfidence: 0.92,
      mismatch: true,
      strongMismatch: true,
    });
  });

  it("a low-confidence disagreement is recorded but not shown as a warning", () => {
    const check = assessHandSide("right", analysisSaying("left", 0.4));
    expect(check).toMatchObject({ canonical: "right", mismatch: true, strongMismatch: false });
  });

  it("agreement or 'unknown' is not a mismatch", () => {
    expect(assessHandSide("right", analysisSaying("right", 0.9)).mismatch).toBe(false);
    expect(assessHandSide("left", analysisSaying("unknown")).mismatch).toBe(false);
  });

  it("analyses stored before handConfidence existed still validate, and their definite guess counts as strong", () => {
    const legacy = analysisSaying("left");
    delete legacy.handConfidence;
    expect(PalmAnalysisSchema.safeParse(legacy).success).toBe(true);
    expect(assessHandSide("right", legacy).strongMismatch).toBe(true);
    expect(PalmAnalysisSchema.safeParse(analysisSaying("left", 1.5)).success).toBe(false);
  });

  it("the reading view keeps the stored selection as the hand", () => {
    const analysis = analysisSaying("left", 0.95);
    const view = buildReadingView({
      reading: {
        id: "r1",
        hand: "RIGHT",
        status: "COMPLETE",
        createdAt: new Date(),
        isDemo: false,
        imageKey: null,
        analysisConfidence: 0.82,
        rejectionReason: null,
      },
      analysis,
      interpretation: composeRuleBasedReading(analysis),
      premium: false,
    });
    expect(view.hand).toBe("right");
    expect(view.handCheck).toMatchObject({
      canonical: "right",
      detected: "left",
      strongMismatch: true,
    });
  });

  it("the interpretation prompt carries the user's hand, never the model's guess", () => {
    const analysis = analysisSaying("left", 0.95);
    const prompt = buildInterpretationPrompt({
      analysis,
      hand: "right",
      available: availableFeatures(analysis),
      rules: matchRules(analysis),
    });
    expect(prompt).toContain("HAND: the visitor's RIGHT hand");
    expect(prompt).toContain('"hand":"right"');
    expect(prompt).not.toContain('"hand":"left"');
    expect(prompt).not.toContain("handConfidence");
  });
});
