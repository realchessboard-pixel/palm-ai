import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as analyze } from "@/app/api/palm/analyze/route";
import { POST as interpret } from "@/app/api/palm/interpret/route";
import { POST as mockComplete } from "@/app/api/payments/mock/complete/route";
import { POST as checkout } from "@/app/api/payments/checkout/route";
import { POST as translate } from "@/app/api/readings/[id]/translation/route";
import { setAiProvider } from "@/lib/ai";
import type { AiRequest } from "@/lib/ai/types";
import { resetEnvCache } from "@/lib/config/env";
import { db } from "@/lib/db";
import { composeRuleBasedReading } from "@/lib/palmistry/interpretation";
import { sampleAnalysis } from "@/lib/palmistry/sample-analysis";
import { resetIdempotencyCache } from "@/lib/pipeline/idempotency";
import { getReadingView } from "@/lib/readings/service";
import { getActorFromRequest } from "@/lib/auth/actor";
import { ScriptedProvider } from "../helpers/ai";
import { hasTestDatabase, resetDatabase } from "../helpers/db";
import { CookieJar, json, makeRequest, params } from "../helpers/http";
import { palmLikeImage } from "../helpers/images";

const ctx = { params: Promise.resolve({}) };

/** The items a translation request asked for (the JSON line of the prompt). */
function requested(request: AiRequest): { id: string; text: string }[] {
  return (JSON.parse(request.prompt.split("\n")[1]!) as { items: { id: string; text: string }[] })
    .items;
}

/** A fake translator: echoes every requested item with a language marker. */
function translator(marker: string) {
  return (request: AiRequest) => {
    const items = { items: requested(request) };
    return JSON.stringify({
      items: items.items.map((i) => ({ id: i.id, text: `${marker} ${i.text}` })),
    });
  };
}

async function completedReading(provider: ScriptedProvider, jar: CookieJar) {
  setAiProvider(provider);
  const form = new FormData();
  form.set(
    "image",
    new Blob([new Uint8Array(await palmLikeImage())], { type: "image/jpeg" }),
    "p.jpg",
  );
  form.set("consent", "true");
  const res = await analyze(
    makeRequest("/api/palm/analyze", { method: "POST", body: form, jar }),
    ctx,
  );
  jar.absorb(res);
  const { readingId } = await json<{ readingId: string }>(res);
  await interpret(makeRequest("/api/palm/interpret", { json: { readingId }, jar }), ctx);
  return readingId;
}

function translateRequest(readingId: string, language: string, jar: CookieJar) {
  return translate(
    makeRequest(`/api/readings/${readingId}/translation`, { json: { language }, jar }),
    params({ id: readingId }),
  );
}

async function viewIn(readingId: string, language: "hi" | "de" | "en", jar: CookieJar) {
  return getReadingView(readingId, await getActorFromRequest(makeRequest("/", { jar })), {
    language,
  });
}

describe.skipIf(!hasTestDatabase)("reading translation", () => {
  beforeEach(async () => {
    await resetDatabase();
    resetIdempotencyCache();
    Object.assign(process.env, { PAYMENT_PROVIDER: "mock" });
    resetEnvCache();
  });
  afterEach(() => setAiProvider(undefined));

  it("translates the visible reading once, caches it, and never re-analyses the palm", async () => {
    const analysis = sampleAnalysis("right");
    const provider = new ScriptedProvider([
      JSON.stringify(analysis),
      JSON.stringify(composeRuleBasedReading(analysis)),
      translator("[hi]"),
      translator("[hi]"),
      translator("[hi]"),
    ]);
    const jar = new CookieJar();
    const readingId = await completedReading(provider, jar);
    expect(provider.requests.map((r) => r.task)).toEqual(["palm_analysis", "palm_interpretation"]);

    // Before translating: Hindi is pending and English is shown meanwhile.
    const before = await viewIn(readingId, "hi", jar);
    expect(before.translationPending).toBe(true);
    expect(before.interpretation!.narrative!.headline).not.toMatch(/^\[hi\]/);

    const res = await translateRequest(readingId, "hi", jar);
    expect(res.status).toBe(200);
    const translatedCalls = provider.requests.filter((r) => r.task === "reading_translation");
    expect(translatedCalls.length).toBeGreaterThan(0);
    // Only translation work: no new analysis or interpretation request.
    expect(provider.requests.filter((r) => r.task !== "reading_translation")).toHaveLength(2);
    expect(translatedCalls[0]!.system).toMatch(/into Hindi/);
    expect(translatedCalls[0]!.system).toContain("गुरु पर्वत");

    const after = await viewIn(readingId, "hi", jar);
    expect(after.translationPending).toBe(false);
    expect(after.language).toBe("hi");
    const n = after.interpretation!.narrative!;
    expect(n.headline).toMatch(/^\[hi\] /);
    expect(n.introduction).toMatch(/^\[hi\] /);
    expect(n.thinking!.text).toMatch(/^\[hi\] /);
    expect(n.strengths.every((s) => s.name.startsWith("[hi] "))).toBe(true);
    // Structure (feature citations) is kept from the original.
    expect(n.thinking!.basedOn.every((k) => k.startsWith("lines.") || k.includes("."))).toBe(true);

    // Asking again costs nothing: it's cached.
    const callsSoFar = provider.requests.length;
    expect(await json(await translateRequest(readingId, "hi", jar))).toEqual({ translated: 0 });
    expect(provider.requests.length).toBe(callsSoFar);

    // English is untouched.
    expect((await viewIn(readingId, "en", jar)).interpretation!.narrative!.headline).not.toMatch(
      /\[hi\]/,
    );
  });

  it("translates only what the visitor may see, and tops up after unlocking", async () => {
    const analysis = sampleAnalysis("right");
    const provider = new ScriptedProvider([
      JSON.stringify(analysis),
      JSON.stringify(composeRuleBasedReading(analysis)),
      ...Array.from({ length: 12 }, () => translator("[de]")),
    ]);
    const jar = new CookieJar();
    const readingId = await completedReading(provider, jar);
    await translateRequest(readingId, "de", jar);

    const firstIds = provider.requests
      .filter((r) => r.task === "reading_translation")
      .flatMap((r) =>
        (
          JSON.parse(r.prompt.slice(r.prompt.indexOf("{"))) as { items: { id: string }[] }
        ).items.map((i) => i.id),
      );
    // Free viewer: the main reading only, never the locked detailed reading.
    expect(firstIds.some((id) => id.startsWith("narrative."))).toBe(true);
    expect(firstIds.some((id) => id.startsWith("sections.") || id.startsWith("mounts."))).toBe(
      false,
    );
    const stored = await db.palmInterpretation.findUniqueOrThrow({ where: { readingId } });
    expect(JSON.stringify((stored.data as { translations: unknown }).translations)).not.toContain(
      "mounts.",
    );

    // Unlock, then only the newly visible texts are translated.
    const started = await json<{ url: string }>(
      await checkout(makeRequest("/api/payments/checkout", { json: { readingId }, jar }), ctx),
    );
    const paymentId = started.url.split("/checkout/sandbox/")[1]!;
    await mockComplete(
      makeRequest("/api/payments/mock/complete", { json: { paymentId, outcome: "success" }, jar }),
      ctx,
    );
    expect((await viewIn(readingId, "de", jar)).translationPending).toBe(true);

    const before = provider.requests.length;
    const topUp = await json<{ translated: number }>(await translateRequest(readingId, "de", jar));
    expect(topUp.translated).toBeGreaterThan(0);
    const secondIds = provider.requests
      .slice(before)
      .flatMap((r) =>
        (
          JSON.parse(r.prompt.slice(r.prompt.indexOf("{"))) as { items: { id: string }[] }
        ).items.map((i) => i.id),
      );
    expect(secondIds.some((id) => id.startsWith("narrative."))).toBe(false);
    expect(secondIds.some((id) => id.startsWith("mounts."))).toBe(true);

    const full = await viewIn(readingId, "de", jar);
    expect(full.translationPending).toBe(false);
    expect(full.interpretation!.mounts.every((m) => m.summary.startsWith("[de] "))).toBe(true);
  });

  it("is limited to the reading's owner and to supported languages", async () => {
    const analysis = sampleAnalysis("right");
    const jar = new CookieJar();
    const readingId = await completedReading(
      new ScriptedProvider([
        JSON.stringify(analysis),
        JSON.stringify(composeRuleBasedReading(analysis)),
      ]),
      jar,
    );
    expect((await translateRequest(readingId, "hi", new CookieJar())).status).toBe(404);
    expect((await translateRequest(readingId, "xx", jar)).status).toBe(400);
  });

  it("rejects a translation that loses or invents items, then retries", async () => {
    const analysis = sampleAnalysis("right");
    const provider = new ScriptedProvider([
      JSON.stringify(analysis),
      JSON.stringify(composeRuleBasedReading(analysis)),
      JSON.stringify({ items: [{ id: "made.up", text: "x" }] }),
      ...Array.from({ length: 6 }, () => translator("[hi]")),
    ]);
    const jar = new CookieJar();
    const readingId = await completedReading(provider, jar);
    expect((await translateRequest(readingId, "hi", jar)).status).toBe(200);
    const view = await viewIn(readingId, "hi", jar);
    expect(view.translationPending).toBe(false);
    expect(JSON.stringify(view.interpretation)).not.toContain('"x"');
  });
});
