import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import { generateStructured } from "@/lib/ai/structured";
import { processPalmImage } from "@/lib/image/process";
import { logger } from "@/lib/logger";
import { availableFeatures } from "@/lib/palmistry/features";
import { matchRules } from "@/lib/palmistry/interpretation";
import { sampleAnalysis } from "@/lib/palmistry/sample-analysis";
import { PipelineTimer, usageCounts } from "@/lib/perf/timing";
import { resetIdempotencyCache, runOnce } from "@/lib/pipeline/idempotency";
import { PalmAnalysisSchema } from "@/lib/schemas/palm-analysis";
import { buildAnalysisPrompt } from "@/prompts/palm-analysis";
import { buildInterpretationPrompt } from "@/prompts/palm-interpretation";
import { ScriptedProvider } from "../helpers/ai";
import { palmLikeImage } from "../helpers/images";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  resetIdempotencyCache();
});

describe("image preprocessing", () => {
  it("keeps detail: caps the long edge at 1600px with high-quality JPEG, no metadata", async () => {
    const big = await sharp(await palmLikeImage())
      .resize(2400, 3200)
      .withMetadata({ exif: { IFD0: { Copyright: "secret-gps-owner" } } })
      .jpeg({ quality: 95 })
      .toBuffer();
    const timer = new PipelineTimer("test");
    const out = await processPalmImage(big, timer);

    const meta = await sharp(out.image).metadata();
    expect(meta.format).toBe("jpeg");
    expect(Math.max(meta.width!, meta.height!)).toBe(1600);
    expect(meta.exif).toBeUndefined();
    expect(out.image.includes(Buffer.from("secret-gps-owner"))).toBe(false);
    // Not aggressively compressed: a 1600px palm photo stays well above thumbnail size.
    expect(out.image.length).toBeGreaterThan(out.thumbnail.length * 3);
    const thumb = await sharp(out.thumbnail).metadata();
    expect([thumb.width, thumb.height]).toEqual([480, 360]);
  });

  it("never upscales small photos", async () => {
    const out = await processPalmImage(await palmLikeImage({ width: 600, height: 800 }));
    const meta = await sharp(out.image).metadata();
    expect([meta.width, meta.height]).toEqual([600, 800]);
  });
});

describe("pipeline timing", () => {
  it("logs step durations only when enabled, with readable token counts", async () => {
    const info = vi.spyOn(logger, "info").mockImplementation(() => undefined);
    vi.stubEnv("PIPELINE_TIMING", "");
    const quiet = new PipelineTimer("analyze");
    await quiet.step("work", async () => 1);
    quiet.finish("ok");
    expect(info).not.toHaveBeenCalled();

    vi.stubEnv("PIPELINE_TIMING", "1");
    const timer = new PipelineTimer("analyze");
    expect(await timer.step("gemini_request", async () => "done")).toBe("done");
    timer.add("db_write", 4.4);
    timer.note({ ai: { usage: usageCounts({ inputTokens: 10, outputTokens: 5 }) } });
    timer.finish("ok");
    const [message, fields] = info.mock.calls[0]!;
    expect(message).toBe("pipeline_timing");
    expect(fields).toMatchObject({
      pipeline: "analyze",
      outcome: "ok",
      steps: { gemini_request: expect.any(Number), db_write: 4 },
      ai: { usage: { input: 10, output: 5 } },
    });
    // Keys avoid "token" so the logger's secret redaction leaves the counts readable.
    expect(JSON.stringify(fields)).not.toMatch(/token/i);
  });
});

describe("structured generation", () => {
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

  it("passes the thinking level through and sums usage across a retry", async () => {
    const provider = new ScriptedProvider(["not json", JSON.stringify(sampleAnalysis())], {
      inputTokens: 100,
      outputTokens: 40,
    });
    const result = await generateStructured({ ...base, provider, thinking: "low" });
    expect(result.attempts).toBe(2);
    expect(provider.requests.map((r) => r.thinking)).toEqual(["low", "low"]);
    expect(result.usage).toEqual({ inputTokens: 200, outputTokens: 80 });
    expect(result.providerMs).toBeGreaterThanOrEqual(0);
    expect(result.validateMs).toBeGreaterThanOrEqual(0);
  });
});

describe("prompts", () => {
  it("tells the vision model coordinates are fractions, not pixels", () => {
    expect(buildAnalysisPrompt({ hand: "right" })).toMatch(/decimal from 0 to 1.*never a pixel/);
  });

  it("drops overlay coordinates from stage 2 but keeps observations and the user's hand", () => {
    const analysis = { ...sampleAnalysis("right"), hand: "left" as const, handConfidence: 0.9 };
    const prompt = buildInterpretationPrompt({
      analysis,
      hand: "right",
      available: availableFeatures(analysis),
      rules: matchRules(analysis),
      sections: ["personality"],
    });
    const observed = prompt.slice(
      prompt.indexOf("OBSERVED PALM FEATURES"),
      prompt.indexOf("AVAILABLE FEATURES"),
    );
    expect(observed).not.toContain('"points"');
    expect(observed).not.toContain("pointsConfidence");
    const heart = analysis.lines.heart;
    if (typeof heart !== "string" && heart.path) expect(prompt).toContain(heart.path.description);
    expect(prompt).toContain('"length"');
    expect(prompt).toContain('"hand":"right"');
    expect(prompt).not.toContain('"hand":"left"');
  });
});

describe("duplicate request protection", () => {
  it("runs a repeated request once and returns the same result", async () => {
    let runs = 0;
    const work = async () => ({ readingId: `r${++runs}` });
    const [a, b] = await Promise.all([
      runOnce("guest:abc", "11111111-1111-4111-8111-111111111111", work),
      runOnce("guest:abc", "11111111-1111-4111-8111-111111111111", work),
    ]);
    expect(runs).toBe(1);
    expect(a).toEqual(b);
    // A later retry of the same request (e.g. after a dropped connection) also reuses it.
    expect(await runOnce("guest:abc", "11111111-1111-4111-8111-111111111111", work)).toEqual(a);
    expect(runs).toBe(1);
  });

  it("never shares results between actors", async () => {
    let runs = 0;
    const work = async () => ++runs;
    const id = "22222222-2222-4222-8222-222222222222";
    expect(await runOnce("user:a", id, work)).toBe(1);
    expect(await runOnce("user:b", id, work)).toBe(2);
  });

  it("does not remember failures, and skips dedupe without an id or identity", async () => {
    let runs = 0;
    const failing = async () => {
      runs++;
      throw new Error("boom");
    };
    const id = "33333333-3333-4333-8333-333333333333";
    await expect(runOnce("user:a", id, failing)).rejects.toThrow("boom");
    await expect(runOnce("user:a", id, failing)).rejects.toThrow("boom");
    expect(runs).toBe(2);

    let plain = 0;
    await runOnce("user:a", undefined, async () => plain++);
    await runOnce(null, id, async () => plain++);
    await runOnce(null, id, async () => plain++);
    expect(plain).toBe(3);
  });
});

describe("forgiving photo handling", () => {
  it("reads a visible palm even when the model calls the photo less than ideal", async () => {
    const { rejectionReason } = await import("@/lib/pipeline/analyze");
    const analysis = sampleAnalysis("right");
    analysis.imageQuality = { ...analysis.imageQuality, usable: false, issues: ["glare"] };
    expect(rejectionReason(analysis)).toBeNull();
    // But a photo with no palm at all is still turned away (nothing to read).
    analysis.imageQuality = { ...analysis.imageQuality, palmVisible: false };
    expect(rejectionReason(analysis)).not.toBeNull();
  });
});

describe("transient error detection", () => {
  it("retries hiccups but never bad photos or security refusals", async () => {
    const { ApiClientError, isTransientError } = await import("@/lib/api-client");
    expect(isTransientError(new ApiClientError("x", "AI_TIMEOUT", 504))).toBe(true);
    expect(isTransientError(new ApiClientError("x", "NETWORK_ERROR", 0))).toBe(true);
    expect(isTransientError(new ApiClientError("x", "INTERNAL_ERROR", 500))).toBe(true);
    expect(isTransientError(new ApiClientError("x", "IMAGE_QUALITY", 422))).toBe(false);
    expect(isTransientError(new ApiClientError("x", "CSRF_REJECTED", 403))).toBe(false);
    expect(isTransientError(new ApiClientError("x", "RATE_LIMITED", 429))).toBe(false);
  });
});
