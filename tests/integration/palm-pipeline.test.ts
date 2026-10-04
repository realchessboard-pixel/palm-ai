import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as analyze } from "@/app/api/palm/analyze/route";
import { POST as interpret } from "@/app/api/palm/interpret/route";
import { DELETE as deleteReading, GET as getReading } from "@/app/api/readings/[id]/route";
import { GET as getImage } from "@/app/api/readings/[id]/image/route";
import { POST as signup } from "@/app/api/auth/signup/route";
import { GET as listReadings } from "@/app/api/readings/route";
import { setAiProvider } from "@/lib/ai";
import { AiError } from "@/lib/ai/types";
import { GUEST_COOKIE } from "@/lib/auth/cookies";
import { db } from "@/lib/db";
import { composeRuleBasedReading } from "@/lib/palmistry/interpretation";
import { sampleAnalysis } from "@/lib/palmistry/sample-analysis";
import type { ReadingView } from "@/lib/readings/view";
import type { MemoryStorage } from "@/lib/storage/memory";
import { ScriptedProvider } from "../helpers/ai";
import { hasTestDatabase, resetDatabase } from "../helpers/db";
import { CookieJar, json, makeRequest, params } from "../helpers/http";
import { palmLikeImage } from "../helpers/images";

const ctx = { params: Promise.resolve({}) };

async function uploadForm(image: Buffer, fields: Record<string, string> = {}) {
  const form = new FormData();
  form.set("image", new Blob([new Uint8Array(image)], { type: "image/jpeg" }), "anything.exe");
  form.set("hand", fields.hand ?? "right");
  if (fields.consent !== "omit") form.set("consent", fields.consent ?? "true");
  form.set("trainingOptIn", fields.trainingOptIn ?? "false");
  return form;
}

async function postAnalyze(jar: CookieJar, image: Buffer, fields: Record<string, string> = {}) {
  const res = await analyze(
    makeRequest("/api/palm/analyze", {
      method: "POST",
      body: await uploadForm(image, fields),
      jar,
    }),
    ctx,
  );
  jar.absorb(res);
  return res;
}

describe.skipIf(!hasTestDatabase)("palm analysis pipeline", () => {
  let storage: MemoryStorage;

  beforeEach(async () => {
    storage = await resetDatabase();
    setAiProvider(undefined);
  });
  afterEach(() => setAiProvider(undefined));

  it("runs the full guest journey: upload → analyze → interpret → view (free tier)", async () => {
    const jar = new CookieJar();
    const res = await postAnalyze(jar, await palmLikeImage());
    expect(res.status).toBe(201);
    const { readingId, isDemo } = await json<{ readingId: string; isDemo: boolean }>(res);
    expect(isDemo).toBe(true); // default test provider is the labelled mock
    expect(jar.get(GUEST_COOKIE)).toBeTruthy();

    const reading = await db.reading.findUniqueOrThrow({
      where: { id: readingId },
      include: { analysis: true },
    });
    expect(reading.status).toBe("ANALYZED");
    expect(reading.userId).toBeNull();
    expect(reading.guestKeyHash).toMatch(/^[a-f0-9]{64}$/);
    // Stored under a generated key, never the user's filename.
    expect(reading.imageKey).toMatch(/^palms\/\d{4}\/\d{2}\/[a-f0-9-]{36}\.jpg$/);
    expect(reading.imageKey).not.toContain("anything");
    expect(storage.objects.has(reading.imageKey!)).toBe(true);
    expect(reading.analysis?.promptVersion).toMatch(/^palm-analysis\//);

    const done = await interpret(
      makeRequest("/api/palm/interpret", { json: { readingId }, jar }),
      ctx,
    );
    expect(done.status).toBe(200);
    expect(await json(done)).toEqual({ readingId, status: "COMPLETE" });

    const view = await getReading(
      makeRequest(`/api/readings/${readingId}`, { jar }),
      params({ id: readingId }),
    );
    const { reading: body } = await json<{ reading: ReadingView }>(view);
    expect(body.status).toBe("COMPLETE");
    expect(body.premium).toBe(false);
    expect(body.analysisConfidence).toBeCloseTo(0.79);
    // Free tier: only personality + career sections, summaries only.
    expect(body.interpretation!.sections.map((s) => s.id).sort()).toEqual([
      "career",
      "personality",
    ]);
    expect(body.interpretation!.sections.every((s) => s.details === null)).toBe(true);
    expect(body.interpretation!.lines.map((l) => l.line).sort()).toEqual(["head", "heart", "life"]);
    expect(body.interpretation!.mounts).toEqual([]);
    expect(body.locked?.sections).toEqual(
      expect.arrayContaining(["relationships", "money", "strengths"]),
    );
    // Premium text must not be present anywhere in the free payload.
    const premiumText = composeRuleBasedReading(sampleAnalysis("right")).sections.find(
      (s) => s.id === "money",
    )!.summary;
    expect(JSON.stringify(body)).not.toContain(premiumText);

    const image = await getImage(
      makeRequest(`/api/readings/${readingId}/image`, { jar }),
      params({ id: readingId }),
    );
    expect(image.status).toBe(200);
    expect(image.headers.get("content-type")).toBe("image/jpeg");
    expect(image.headers.get("cache-control")).toBe("private, no-store");
  });

  it("hides readings and images from other visitors", async () => {
    const owner = new CookieJar();
    const { readingId } = await json<{ readingId: string }>(
      await postAnalyze(owner, await palmLikeImage()),
    );
    const stranger = new CookieJar();
    await postAnalyze(stranger, await palmLikeImage());

    for (const jar of [stranger, new CookieJar()]) {
      const view = await getReading(
        makeRequest(`/api/readings/${readingId}`, { jar }),
        params({ id: readingId }),
      );
      expect(view.status).toBe(404);
      const image = await getImage(
        makeRequest(`/api/readings/${readingId}/image`, { jar }),
        params({ id: readingId }),
      );
      expect(image.status).toBe(404);
      const del = await deleteReading(
        makeRequest(`/api/readings/${readingId}`, { method: "DELETE", jar }),
        params({ id: readingId }),
      );
      expect(del.status).toBe(404);
      const run = await interpret(
        makeRequest("/api/palm/interpret", { json: { readingId }, jar }),
        ctx,
      );
      expect(run.status).toBe(404);
    }
    expect(await db.reading.count({ where: { id: readingId } })).toBe(1);
  });

  it("claims guest readings on sign-up and lists them in the dashboard", async () => {
    const jar = new CookieJar();
    const { readingId } = await json<{ readingId: string }>(
      await postAnalyze(jar, await palmLikeImage()),
    );
    const res = await signup(
      makeRequest("/api/auth/signup", {
        json: { email: "palm@example.com", password: "long enough pw" },
        jar,
      }),
      ctx,
    );
    jar.absorb(res);
    const list = await json<{ readings: { id: string }[] }>(
      await listReadings(makeRequest("/api/readings", { jar }), ctx),
    );
    expect(list.readings.map((r) => r.id)).toEqual([readingId]);
    const reading = await db.reading.findUniqueOrThrow({ where: { id: readingId } });
    expect(reading.userId).not.toBeNull();
  });

  it("deletes the reading and its stored images", async () => {
    const jar = new CookieJar();
    const { readingId } = await json<{ readingId: string }>(
      await postAnalyze(jar, await palmLikeImage()),
    );
    expect(storage.objects.size).toBe(2);
    const res = await deleteReading(
      makeRequest(`/api/readings/${readingId}`, { method: "DELETE", jar }),
      params({ id: readingId }),
    );
    expect(res.status).toBe(200);
    expect(storage.objects.size).toBe(0);
    expect(await db.reading.count()).toBe(0);
    expect(await db.palmAnalysis.count()).toBe(0);
  });

  describe("upload validation", () => {
    it.each([
      [
        "not an image",
        Buffer.from("MZ this is not an image at all, just text pretending"),
        400,
        "IMAGE_INVALID",
      ],
      [
        "a truncated JPEG",
        Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3]),
        400,
        "IMAGE_INVALID",
      ],
    ])("rejects %s", async (_label, image, status, code) => {
      const res = await postAnalyze(new CookieJar(), image as Buffer);
      expect(res.status).toBe(status);
      expect((await json<{ error: { code: string } }>(res)).error.code).toBe(code);
      expect(await db.reading.count()).toBe(0);
      expect(storage.objects.size).toBe(0);
    });

    it("rejects an extremely dark photo with a helpful message", async () => {
      const res = await postAnalyze(new CookieJar(), await palmLikeImage({ brightness: 0.2 }));
      expect(res.status).toBe(422);
      expect((await json<{ error: { message: string } }>(res)).error.message).toBe(
        "Your palm is too dark. Try taking the photo in brighter light.",
      );
    });

    it("rejects an extremely blurry photo", async () => {
      const res = await postAnalyze(new CookieJar(), await palmLikeImage({ blur: 14 }));
      expect(res.status).toBe(422);
      expect((await json<{ error: { message: string } }>(res)).error.message).toMatch(/blurry/);
    });

    it("rejects images below the minimum resolution", async () => {
      const res = await postAnalyze(
        new CookieJar(),
        await palmLikeImage({ width: 300, height: 400 }),
      );
      expect(res.status).toBe(422);
    });

    it("accepts PNG and WebP and re-encodes them as metadata-free JPEG", async () => {
      for (const format of ["png", "webp"] as const) {
        const res = await postAnalyze(new CookieJar(), await palmLikeImage({ format }));
        expect(res.status).toBe(201);
      }
      for (const obj of storage.objects.values()) {
        expect(obj.data.subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff]));
        expect(obj.data.includes(Buffer.from("Exif"))).toBe(false);
      }
    });

    it("requires consent and a valid hand", async () => {
      const noConsent = await postAnalyze(new CookieJar(), await palmLikeImage(), {
        consent: "omit",
      });
      expect(noConsent.status).toBe(400);
      const badHand = await postAnalyze(new CookieJar(), await palmLikeImage(), { hand: "both" });
      expect(badHand.status).toBe(400);
    });

    it("rejects oversized uploads before processing", async () => {
      const big = Buffer.alloc(5 * 1024 * 1024, 1);
      big.set([0xff, 0xd8, 0xff], 0);
      const res = await postAnalyze(new CookieJar(), big);
      expect(res.status).toBe(413);
    });

    it("rejects non-multipart requests", async () => {
      const res = await analyze(makeRequest("/api/palm/analyze", { json: { hand: "left" } }), ctx);
      expect(res.status).toBe(400);
    });
  });

  describe("AI failure handling", () => {
    it("rejects the photo when the vision model can't see a palm, and deletes it", async () => {
      const notPalm = {
        ...sampleAnalysis(),
        imageQuality: {
          score: 0.2,
          usable: false,
          palmVisible: false,
          palmVisibilityConfidence: 0.9,
          issues: ["back_of_hand"],
        },
      };
      setAiProvider(new ScriptedProvider([JSON.stringify(notPalm)]));
      const res = await postAnalyze(new CookieJar(), await palmLikeImage());
      expect(res.status).toBe(422);
      expect((await json<{ error: { message: string } }>(res)).error.message).toMatch(
        /back of a hand/,
      );
      const reading = await db.reading.findFirstOrThrow();
      expect(reading.status).toBe("REJECTED");
      expect(reading.imageKey).toBeNull();
      expect(storage.objects.size).toBe(0);
    });

    it("returns a controlled error after repeated invalid JSON and cleans up", async () => {
      setAiProvider(new ScriptedProvider(["```json\n{ nope", '{"hand": "right"}']));
      const res = await postAnalyze(new CookieJar(), await palmLikeImage());
      expect(res.status).toBe(502);
      const body = await json<{ error: { code: string; message: string } }>(res);
      expect(body.error).toEqual({
        code: "AI_INVALID_RESPONSE",
        message: "We couldn't analyze this palm right now. Please try again.",
      });
      expect(JSON.stringify(body)).not.toMatch(/stack|Error:/);
      const reading = await db.reading.findFirstOrThrow();
      expect(reading.status).toBe("FAILED");
      expect(storage.objects.size).toBe(0);
    });

    it("maps timeouts to a friendly 504", async () => {
      setAiProvider(new ScriptedProvider([new AiError("timeout", "slow")]));
      const res = await postAnalyze(new CookieJar(), await palmLikeImage());
      expect(res.status).toBe(504);
      expect((await json<{ error: { message: string } }>(res)).error.message).toBe(
        "The analysis took too long. Please try again.",
      );
    });

    it("uses a real (non-mock) provider for interpretation and grounds its output", async () => {
      const analysis = sampleAnalysis();
      analysis.lines.fate = "insufficient_visibility";
      const written = composeRuleBasedReading(sampleAnalysis());
      // The model mentions the fate line even though it wasn't observed.
      written.sections[0].summary += " Your fate line shows a strong career direction.";
      const provider = new ScriptedProvider([JSON.stringify(analysis), JSON.stringify(written)]);
      setAiProvider(provider);

      const jar = new CookieJar();
      const { readingId, isDemo } = await json<{ readingId: string; isDemo: boolean }>(
        await postAnalyze(jar, await palmLikeImage()),
      );
      expect(isDemo).toBe(false);
      const res = await interpret(
        makeRequest("/api/palm/interpret", { json: { readingId }, jar }),
        ctx,
      );
      expect(res.status).toBe(200);

      // Stage 2 never receives the image.
      expect(provider.requests[1].image).toBeUndefined();
      expect(provider.requests[1].prompt).toContain("AVAILABLE FEATURES");
      expect(provider.requests[1].prompt).not.toMatch(/- lines\.fate /);

      const stored = await db.palmInterpretation.findUniqueOrThrow({ where: { readingId } });
      expect(JSON.stringify(stored.data)).not.toMatch(/fate line/i);
      expect(stored.removedCount).toBeGreaterThan(0);
    });

    it("keeps the user's selected hand when the vision model disagrees (selected RIGHT, model LEFT)", async () => {
      const analysis = { ...sampleAnalysis("right"), hand: "left" as const, handConfidence: 0.95 };
      const provider = new ScriptedProvider([
        JSON.stringify(analysis),
        JSON.stringify(composeRuleBasedReading(sampleAnalysis("right"))),
      ]);
      setAiProvider(provider);

      const jar = new CookieJar();
      const res = await postAnalyze(jar, await palmLikeImage(), { hand: "right" });
      expect(res.status).toBe(201);
      const { readingId } = await json<{ readingId: string }>(res);
      expect(
        (await interpret(makeRequest("/api/palm/interpret", { json: { readingId }, jar }), ctx))
          .status,
      ).toBe(200);

      // Canonical hand is the selection; the model's guess is kept only as a raw observation.
      const reading = await db.reading.findUniqueOrThrow({
        where: { id: readingId },
        include: { analysis: true, interpretation: true },
      });
      expect(reading.hand).toBe("RIGHT");
      expect((reading.analysis!.data as { hand: string }).hand).toBe("left");
      // Generated once — the mismatch doesn't trigger regeneration.
      expect(reading.interpretation!.attempts).toBe(1);
      expect(provider.requests).toHaveLength(2);

      // Stage 2 was told the user's hand, not the model's guess.
      expect(provider.requests[1].prompt).toContain("HAND: the user's RIGHT hand");
      expect(provider.requests[1].prompt).not.toContain('"hand":"left"');

      const view = await getReading(
        makeRequest(`/api/readings/${readingId}`, { jar }),
        params({ id: readingId }),
      );
      const { reading: body } = await json<{ reading: ReadingView }>(view);
      expect(body.hand).toBe("right");
      expect(body.handCheck).toMatchObject({
        canonical: "right",
        detected: "left",
        strongMismatch: true,
      });
    });

    it("keeps the analysis when interpretation fails so it can be retried", async () => {
      setAiProvider(
        new ScriptedProvider([JSON.stringify(sampleAnalysis()), "garbage", "more garbage"]),
      );
      const jar = new CookieJar();
      const { readingId } = await json<{ readingId: string }>(
        await postAnalyze(jar, await palmLikeImage()),
      );
      const failed = await interpret(
        makeRequest("/api/palm/interpret", { json: { readingId }, jar }),
        ctx,
      );
      expect(failed.status).toBe(502);
      const reading = await db.reading.findUniqueOrThrow({ where: { id: readingId } });
      expect(reading.status).toBe("ANALYZED");
      expect(reading.errorCode).toBe("AI_INVALID_RESPONSE");

      setAiProvider(
        new ScriptedProvider([JSON.stringify(composeRuleBasedReading(sampleAnalysis()))]),
      );
      const retried = await interpret(
        makeRequest("/api/palm/interpret", { json: { readingId }, jar }),
        ctx,
      );
      expect(retried.status).toBe(200);
    });

    it("reports a missing AI configuration without storing anything", async () => {
      setAiProvider(undefined);
      const previous = process.env.AI_PROVIDER;
      process.env.AI_PROVIDER = "";
      const { resetEnvCache } = await import("@/lib/config/env");
      resetEnvCache();
      try {
        const res = await postAnalyze(new CookieJar(), await palmLikeImage());
        expect(res.status).toBe(503);
        expect(await db.reading.count()).toBe(0);
        expect(storage.objects.size).toBe(0);
      } finally {
        process.env.AI_PROVIDER = previous;
        resetEnvCache();
      }
    });
  });
});
