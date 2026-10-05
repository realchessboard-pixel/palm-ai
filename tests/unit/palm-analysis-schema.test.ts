import { describe, expect, it } from "vitest";
import { sampleAnalysis } from "@/lib/palmistry/sample-analysis";
import { PalmAnalysisSchema } from "@/lib/schemas/palm-analysis";

const clone = <T>(v: T): T => structuredClone(v);

describe("PalmAnalysisSchema", () => {
  it("accepts a well-formed analysis", () => {
    expect(PalmAnalysisSchema.safeParse(sampleAnalysis()).success).toBe(true);
  });

  it("accepts insufficient_visibility for lines, mounts, fingers and palm shape", () => {
    const a = clone(sampleAnalysis()) as Record<string, unknown> &
      ReturnType<typeof sampleAnalysis>;
    const data = {
      ...a,
      palmShape: "insufficient_visibility",
      fingers: "insufficient_visibility",
      lines: { ...a.lines, fate: "insufficient_visibility" },
      mounts: { ...a.mounts, venus: "insufficient_visibility" },
    };
    expect(PalmAnalysisSchema.safeParse(data).success).toBe(true);
  });

  it("rejects invented details on a line marked not visible", () => {
    const a = clone(sampleAnalysis());
    a.lines.fate = {
      visible: false,
      confidence: 0.2,
      length: "long",
      curvature: null,
      depth: null,
      breaks: null,
      forks: [],
      intersections: [],
      markings: [],
      path: null,
    };
    const result = PalmAnalysisSchema.safeParse(a);
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toMatch(/must not include any attribute details/);
  });

  it("accepts a not-visible line with all attributes empty", () => {
    const a = clone(sampleAnalysis());
    a.lines.fate = {
      visible: false,
      confidence: 0.7,
      length: null,
      curvature: null,
      depth: null,
      breaks: null,
      forks: [],
      intersections: [],
      markings: [],
      path: null,
    };
    expect(PalmAnalysisSchema.safeParse(a).success).toBe(true);
  });

  it.each([
    [
      "confidence above 1",
      (a: ReturnType<typeof sampleAnalysis>) => void (a.overallConfidence = 1.4),
    ],
    [
      "unknown enum value",
      (a: ReturnType<typeof sampleAnalysis>) =>
        void ((a.lines.heart as { length: string }).length = "huge"),
    ],
    [
      "missing section",
      (a: ReturnType<typeof sampleAnalysis>) => void delete (a as Partial<typeof a>).mounts,
    ],
    [
      "coordinate outside image",
      (a: ReturnType<typeof sampleAnalysis>) => {
        const heart = a.lines.heart as { path: { points: { x: number; y: number }[] } };
        heart.path.points[0].x = 1.5;
      },
    ],
    [
      "unknown marking",
      (a: ReturnType<typeof sampleAnalysis>) =>
        void ((a.markings[0] as { type: string }).type = "pentagram"),
    ],
  ])("rejects %s", (_label, mutate) => {
    const a = clone(sampleAnalysis());
    mutate(a);
    expect(PalmAnalysisSchema.safeParse(a).success).toBe(false);
  });

  it("rejects non-objects and strings that look like JSON", () => {
    expect(PalmAnalysisSchema.safeParse(JSON.stringify(sampleAnalysis())).success).toBe(false);
    expect(PalmAnalysisSchema.safeParse(null).success).toBe(false);
  });
});
