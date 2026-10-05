import { describe, expect, it } from "vitest";
import { extractJson, JsonExtractionError } from "@/lib/ai/json";
import { generateStructured } from "@/lib/ai/structured";
import { AiError } from "@/lib/ai/types";
import { AppError } from "@/lib/http/errors";
import { sampleAnalysis } from "@/lib/palmistry/sample-analysis";
import { PalmAnalysisSchema } from "@/lib/schemas/palm-analysis";
import { ScriptedProvider } from "../helpers/ai";

const base = {
  task: "palm_analysis" as const,
  model: "test-model",
  system: "sys",
  prompt: "prompt",
  schema: PalmAnalysisSchema,
  maxTokens: 100,
  timeoutMs: 5000,
  maxAttempts: 2,
};

describe("extractJson", () => {
  it("parses plain JSON without repair", () => {
    expect(extractJson('{"a":1}')).toEqual({ value: { a: 1 }, repaired: false });
  });
  it("strips code fences and surrounding prose", () => {
    expect(extractJson('Here you go:\n```json\n{"a": [1, 2]}\n```\nThanks')).toEqual({
      value: { a: [1, 2] },
      repaired: true,
    });
  });
  it("removes trailing commas but not commas inside strings", () => {
    expect(extractJson('{"a": [1, 2,], "b": "x,]",}').value).toEqual({ a: [1, 2], b: "x,]" });
  });
  it("refuses to guess when there is no JSON", () => {
    expect(() => extractJson("I cannot help with that.")).toThrow(JsonExtractionError);
    expect(() => extractJson("")).toThrow(JsonExtractionError);
  });
});

describe("generateStructured", () => {
  it("returns validated data on the first attempt", async () => {
    const provider = new ScriptedProvider([JSON.stringify(sampleAnalysis())]);
    const result = await generateStructured({ ...base, provider });
    expect(result.attempts).toBe(1);
    expect(result.data.hand).toBe("right");
  });

  it("retries with a strict correction note after invalid JSON", async () => {
    const provider = new ScriptedProvider(["not json at all", JSON.stringify(sampleAnalysis())]);
    const result = await generateStructured({ ...base, provider });
    expect(result.attempts).toBe(2);
    expect(provider.requests[1].prompt).toMatch(/previous response could not be accepted/);
    expect(provider.requests[1].prompt).toMatch(/ONLY one valid JSON object/);
  });

  it("retries when JSON doesn't match the schema, listing the problems", async () => {
    const bad = { ...sampleAnalysis(), overallConfidence: 7 };
    const provider = new ScriptedProvider([JSON.stringify(bad), JSON.stringify(sampleAnalysis())]);
    await generateStructured({ ...base, provider });
    expect(provider.requests[1].prompt).toMatch(/overallConfidence/);
  });

  it("returns a controlled error when output stays invalid", async () => {
    const provider = new ScriptedProvider(["{}", "{}"]);
    await expect(generateStructured({ ...base, provider })).rejects.toMatchObject({
      code: "AI_INVALID_RESPONSE",
    });
  });

  it("maps provider failures to friendly error codes", async () => {
    await expect(
      generateStructured({
        ...base,
        provider: new ScriptedProvider([new AiError("timeout", "t")]),
      }),
    ).rejects.toMatchObject({ code: "AI_TIMEOUT" });
    await expect(
      generateStructured({
        ...base,
        provider: new ScriptedProvider([new AiError("auth", "bad key")]),
      }),
    ).rejects.toMatchObject({ code: "AI_NOT_CONFIGURED" });
    await expect(
      generateStructured({
        ...base,
        provider: new ScriptedProvider([
          new AiError("refused", "no"),
          JSON.stringify(sampleAnalysis()),
        ]),
      }),
    ).rejects.toMatchObject({ code: "AI_UNAVAILABLE" });
  });

  it("retries transient provider errors", async () => {
    const provider = new ScriptedProvider([
      new AiError("unavailable", "503"),
      JSON.stringify(sampleAnalysis()),
    ]);
    const result = await generateStructured({ ...base, provider });
    expect(result.attempts).toBe(2);
  });

  it("applies semantic checks", async () => {
    const provider = new ScriptedProvider([
      JSON.stringify(sampleAnalysis()),
      JSON.stringify(sampleAnalysis()),
    ]);
    const error = await generateStructured({
      ...base,
      provider,
      check: () => ["always wrong"],
    }).catch((e) => e);
    expect(error).toBeInstanceOf(AppError);
    expect(provider.requests[1].prompt).toMatch(/always wrong/);
  });
});
