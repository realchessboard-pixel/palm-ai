import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as trackEvent } from "@/app/api/events/route";
import { POST as analyze } from "@/app/api/palm/analyze/route";
import { POST as interpret } from "@/app/api/palm/interpret/route";
import { POST as cancel } from "@/app/api/payments/cancel/route";
import { POST as checkout } from "@/app/api/payments/checkout/route";
import { POST as mockComplete } from "@/app/api/payments/mock/complete/route";
import { POST as razorpayVerify } from "@/app/api/payments/razorpay/verify/route";
import { POST as signup } from "@/app/api/auth/signup/route";
import { GET as getReading } from "@/app/api/readings/[id]/route";
import { GET as getReport } from "@/app/api/readings/[id]/report/route";
import { setAiProvider } from "@/lib/ai";
import { resetEnvCache } from "@/lib/config/env";
import { db } from "@/lib/db";
import { composeRuleBasedReading } from "@/lib/palmistry/interpretation";
import { sampleAnalysis } from "@/lib/palmistry/sample-analysis";
import { EXTENDED_READING_PRICE_INR } from "@/lib/monetization/price";
import { hmacSha256Hex } from "@/lib/payments/signatures";
import { extendedReadingPrice } from "@/lib/payments/pricing";
import { confirmStripeReturn } from "@/lib/payments/service";
import type { ReadingView } from "@/lib/readings/view";
import { ScriptedProvider } from "../helpers/ai";
import { hasTestDatabase, resetDatabase } from "../helpers/db";
import { CookieJar, json, makeRequest, params } from "../helpers/http";
import { palmLikeImage } from "../helpers/images";

const ctx = { params: Promise.resolve({}) };

function setEnv(values: Record<string, string>) {
  Object.assign(process.env, values);
  resetEnvCache();
}

async function completedReading(jar: CookieJar, hand: "left" | "right" = "right") {
  const form = new FormData();
  form.set(
    "image",
    new Blob([new Uint8Array(await palmLikeImage())], { type: "image/jpeg" }),
    "p.jpg",
  );
  form.set("hand", hand);
  form.set("consent", "true");
  const res = await analyze(
    makeRequest("/api/palm/analyze", { method: "POST", body: form, jar }),
    ctx,
  );
  jar.absorb(res);
  const { readingId } = await json<{ readingId: string }>(res);
  const done = await interpret(
    makeRequest("/api/palm/interpret", { json: { readingId }, jar }),
    ctx,
  );
  expect(done.status).toBe(200);
  return readingId;
}

async function view(readingId: string, jar: CookieJar, query = "") {
  const res = await getReading(
    makeRequest(`/api/readings/${readingId}${query}`, { jar }),
    params({ id: readingId }),
  );
  return {
    status: res.status,
    text: await res.clone().text(),
    body: await json<{ reading: ReadingView }>(res),
  };
}

async function startMockCheckout(jar: CookieJar, readingId: string): Promise<string> {
  const res = await checkout(
    makeRequest("/api/payments/checkout", { json: { readingId }, jar }),
    ctx,
  );
  const { url } = await json<{ type: string; url: string }>(res);
  return url.split("/checkout/sandbox/")[1]!;
}

function settle(jar: CookieJar, paymentId: string, outcome: "success" | "failure" | "cancel") {
  return mockComplete(
    makeRequest("/api/payments/mock/complete", { json: { paymentId, outcome }, jar }),
    ctx,
  );
}

async function reportStatus(readingId: string, jar: CookieJar) {
  return (
    await getReport(
      makeRequest(`/api/readings/${readingId}/report`, { jar }),
      params({ id: readingId }),
    )
  ).status;
}

/** How a string appears inside a JSON response body. */
const asJson = (text: string) => JSON.stringify(text).slice(1, -1);

/** Text that only the detailed reading contains (mount readings and in-depth details). */
async function premiumOnlyText(readingId: string): Promise<string[]> {
  const stored = await db.palmInterpretation.findUniqueOrThrow({ where: { readingId } });
  const data = stored.data as {
    mounts: { details: string }[];
    sections: { id: string; details: string }[];
  };
  const texts = [
    ...data.mounts.map((m) => m.details),
    ...data.sections.filter((s) => s.id === "money" || s.id === "lifePath").map((s) => s.details),
  ].filter(Boolean);
  expect(texts.length).toBeGreaterThan(2); // the checks below must compare real content
  return texts;
}

describe.skipIf(!hasTestDatabase)("₹35 detailed reading", () => {
  beforeEach(async () => {
    await resetDatabase();
    setAiProvider(undefined);
    setEnv({ PAYMENT_PROVIDER: "mock", NODE_ENV: "test", DEMO_MODE: "false" });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    setAiProvider(undefined);
    setEnv({ PAYMENT_PROVIDER: "mock", NODE_ENV: "test", DEMO_MODE: "false" });
  });

  it("a guest completes a useful free basic reading without paying (tests 1, 2, 11)", async () => {
    const jar = new CookieJar();
    const readingId = await completedReading(jar);
    const { body } = await view(readingId, jar);
    const reading = body.reading;

    expect(reading.status).toBe("COMPLETE");
    expect(reading.premium).toBe(false);
    expect(reading.paymentState).toBe("UNPAID");
    expect(reading.interpretation!.overview.summary.length).toBeGreaterThan(20);
    // The whole main reading is free: thinking, caring, strengths, career and an insight.
    const narrative = reading.interpretation!.narrative!;
    expect(narrative.thinking?.text).toBeTruthy();
    expect(narrative.caring?.text).toBeTruthy();
    expect(narrative.strengths.length).toBeGreaterThanOrEqual(3);
    expect(narrative.insight?.text).toBeTruthy();
    expect(reading.hand).toBe("right");
    expect(reading.features.length).toBeGreaterThan(0);
    expect(await db.payment.count()).toBe(0);
    expect(await db.reading.findUniqueOrThrow({ where: { id: readingId } })).toMatchObject({
      userId: null,
    });
  });

  it("keeps the detailed reading locked and out of the response without payment (test 3)", async () => {
    const jar = new CookieJar();
    const readingId = await completedReading(jar);
    const { body, text } = await view(readingId, jar);
    expect(body.reading.locked).not.toBeNull();
    expect(body.reading.interpretation!.mounts).toEqual([]);
    expect(body.reading.interpretation!.sections.every((s) => !s.details)).toBe(true);
    for (const secret of await premiumOnlyText(readingId))
      expect(text).not.toContain(asJson(secret));
    expect(await reportStatus(readingId, jar)).toBe(403);
  });

  it("prices the detailed reading at ₹35 from the central config, and checkout starts at ₹35 INR (tests 4, 5)", async () => {
    expect(EXTENDED_READING_PRICE_INR).toBe(35);
    expect(extendedReadingPrice()).toEqual({ amount: 3500, currency: "inr", label: "₹35" });

    const jar = new CookieJar();
    const readingId = await completedReading(jar);
    await startMockCheckout(jar, readingId);
    expect(await db.payment.findFirstOrThrow()).toMatchObject({
      readingId,
      amount: 3500,
      currency: "inr",
      status: "PENDING",
    });
    expect((await view(readingId, jar)).body.reading).toMatchObject({
      premium: false,
      paymentState: "PAYMENT_INITIATED",
    });

    // A real provider gets the same amount and currency.
    setEnv({ PAYMENT_PROVIDER: "stripe", STRIPE_SECRET_KEY: "sk_test_x" });
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ id: "cs_test_9", url: "https://checkout.stripe.com/x" })),
      );
    await checkout(makeRequest("/api/payments/checkout", { json: { readingId }, jar }), ctx);
    const form = new URLSearchParams(String(fetchMock.mock.calls[0][1]!.body));
    expect(form.get("line_items[0][price_data][unit_amount]")).toBe("3500");
    expect(form.get("line_items[0][price_data][currency]")).toBe("inr");
  });

  it("a failed payment does not unlock anything (test 6)", async () => {
    const jar = new CookieJar();
    const readingId = await completedReading(jar);
    const paymentId = await startMockCheckout(jar, readingId);
    expect((await settle(jar, paymentId, "failure")).status).toBe(200);

    const { body, text } = await view(readingId, jar);
    expect(body.reading).toMatchObject({ premium: false, paymentState: "PAYMENT_FAILED" });
    for (const secret of await premiumOnlyText(readingId))
      expect(text).not.toContain(asJson(secret));
    expect(await reportStatus(readingId, jar)).toBe(403);
    // A finished checkout can't be flipped to success afterwards.
    expect((await settle(jar, paymentId, "success")).status).toBe(409);
    expect((await view(readingId, jar)).body.reading.premium).toBe(false);
    expect(await db.entitlement.count()).toBe(0);
  });

  it("a cancelled payment does not unlock anything (test 7)", async () => {
    const jar = new CookieJar();
    const readingId = await completedReading(jar);
    const paymentId = await startMockCheckout(jar, readingId);
    expect((await settle(jar, paymentId, "cancel")).status).toBe(200);
    expect((await db.payment.findFirstOrThrow()).status).toBe("CANCELLED");
    expect((await view(readingId, jar)).body.reading).toMatchObject({
      premium: false,
      paymentState: "PAYMENT_CANCELLED",
    });
    expect(await reportStatus(readingId, jar)).toBe(403);

    // Closing a provider window (e.g. Razorpay) cancels the pending attempt the same way.
    await startMockCheckout(jar, readingId);
    const res = await cancel(
      makeRequest("/api/payments/cancel", { json: { readingId }, jar }),
      ctx,
    );
    expect(res.status).toBe(200);
    expect(await db.payment.count({ where: { status: "CANCELLED" } })).toBe(2);
    expect((await view(readingId, jar)).body.reading.premium).toBe(false);
  });

  it("a verified payment unlocks the full detailed reading, with no extra AI call (tests 8, 13)", async () => {
    const provider = new ScriptedProvider([
      JSON.stringify(sampleAnalysis("right")),
      JSON.stringify(composeRuleBasedReading(sampleAnalysis("right"))),
    ]);
    setAiProvider(provider);
    const jar = new CookieJar();
    const readingId = await completedReading(jar);
    const paymentId = await startMockCheckout(jar, readingId);
    expect((await settle(jar, paymentId, "success")).status).toBe(200);

    const { body, text } = await view(readingId, jar);
    expect(body.reading).toMatchObject({ premium: true, paymentState: "PAYMENT_SUCCESS" });
    expect(body.reading.locked).toBeNull();
    expect(body.reading.interpretation!.mounts.length).toBeGreaterThan(0);
    for (const secret of await premiumOnlyText(readingId)) expect(text).toContain(asJson(secret));
    expect(await reportStatus(readingId, jar)).toBe(200);
    // Unlocking reuses the stored reading: still exactly one vision + one interpretation call.
    expect(provider.requests.map((r) => r.task)).toEqual(["palm_analysis", "palm_interpretation"]);
  });

  it("Reading A's payment can never unlock Reading B (test 9)", async () => {
    const jar = new CookieJar();
    const readingA = await completedReading(jar);
    const readingB = await completedReading(jar);
    const paymentA = await startMockCheckout(jar, readingA);
    await settle(jar, paymentA, "success");

    expect((await view(readingA, jar)).body.reading.premium).toBe(true);
    expect((await view(readingB, jar)).body.reading.premium).toBe(false);
    // Replaying A's settled payment does nothing for B.
    expect((await settle(jar, paymentA, "success")).status).toBe(409);
    await confirmStripeReturn("cs_replayed", readingB);
    expect((await view(readingB, jar)).body.reading.premium).toBe(false);
    expect(await db.entitlement.count()).toBe(1);
    expect(await db.entitlement.findFirstOrThrow()).toMatchObject({ readingId: readingA });

    // A Razorpay signature for A's order unlocks A's reading only (the reading comes from
    // the server-side payment record, not from the request).
    setEnv({ PAYMENT_PROVIDER: "razorpay" });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "order_B", amount: 3500, currency: "INR" })),
    );
    await checkout(
      makeRequest("/api/payments/checkout", { json: { readingId: readingB }, jar }),
      ctx,
    );
    vi.restoreAllMocks();
    const forgedForB = await razorpayVerify(
      makeRequest("/api/payments/razorpay/verify", {
        json: {
          orderId: "order_B",
          paymentId: "pay_A",
          signature: hmacSha256Hex("rzp_test_secret", "order_A|pay_A"),
        },
        jar,
      }),
      ctx,
    );
    expect(forgedForB.status).toBe(402);
    expect((await view(readingB, jar)).body.reading.premium).toBe(false);
  });

  it("client-side or API manipulation cannot unlock premium content (test 10)", async () => {
    const jar = new CookieJar();
    const readingId = await completedReading(jar);

    // URL / query flags are ignored.
    const flagged = await view(readingId, jar, "?premium=true&checkout=success&unlocked=1");
    expect(flagged.body.reading.premium).toBe(false);
    // Outcome events can't be spoofed from the browser.
    for (const name of ["extended_payment_success", "extended_reading_unlocked"]) {
      const res = await trackEvent(
        makeRequest("/api/events", { json: { name, readingId }, jar }),
        ctx,
      );
      expect(res.status).toBe(400);
    }
    // Someone else can't settle (or even see) this reading's checkout.
    const paymentId = await startMockCheckout(jar, readingId);
    expect((await settle(new CookieJar(), paymentId, "success")).status).toBe(404);
    // The sandbox is refused when a real provider is configured...
    setEnv({ PAYMENT_PROVIDER: "stripe", STRIPE_SECRET_KEY: "sk_test_x" });
    expect((await settle(jar, paymentId, "success")).status).toBe(404);
    // ...and in production unless DEMO_MODE, so mock payments can't pass as real ones.
    setEnv({ PAYMENT_PROVIDER: "mock", NODE_ENV: "production", DEMO_MODE: "false" });
    expect((await settle(jar, paymentId, "success")).status).toBe(404);
    setEnv({ NODE_ENV: "test" });

    expect((await view(readingId, jar)).body.reading.premium).toBe(false);
    expect(await db.entitlement.count()).toBe(0);
  });

  it("signed-in users follow the same free → ₹35 flow", async () => {
    const jar = new CookieJar();
    const res = await signup(
      makeRequest("/api/auth/signup", {
        json: { email: "buyer@example.com", password: "a-strong-password" },
      }),
      ctx,
    );
    jar.absorb(res);
    const readingId = await completedReading(jar);
    expect((await view(readingId, jar)).body.reading.premium).toBe(false);
    await settle(jar, await startMockCheckout(jar, readingId), "success");
    expect((await view(readingId, jar)).body.reading.premium).toBe(true);
    expect(await db.payment.findFirstOrThrow()).toMatchObject({ userId: expect.any(String) });
  });

  it("reads the right hand through purchase, whatever the model guesses (test 12)", async () => {
    setAiProvider(
      new ScriptedProvider([
        JSON.stringify({ ...sampleAnalysis("right"), hand: "left", handConfidence: 0.95 }),
        JSON.stringify(composeRuleBasedReading(sampleAnalysis("right"))),
      ]),
    );
    const jar = new CookieJar();
    // Even an old client still sending "left" gets a right-hand reading.
    const readingId = await completedReading(jar, "left");
    await settle(jar, await startMockCheckout(jar, readingId), "success");
    const { reading } = (await view(readingId, jar)).body;
    expect(reading.premium).toBe(true);
    expect(reading.hand).toBe("right");
    expect(reading.handCheck).toMatchObject({ canonical: "right", detected: "left" });
  });

  it("records the funnel with price, provider, model and demo flag — and no personal data", async () => {
    const jar = new CookieJar();
    const readingId = await completedReading(jar);
    const viewed = await trackEvent(
      makeRequest("/api/events", { json: { name: "extended_offer_viewed", readingId }, jar }),
      ctx,
    );
    expect(viewed.status).toBe(204);
    // Not for someone else's reading.
    const foreign = await trackEvent(
      makeRequest("/api/events", {
        json: { name: "extended_offer_viewed", readingId },
        jar: new CookieJar(),
      }),
      ctx,
    );
    expect(foreign.status).toBe(404);

    await settle(jar, await startMockCheckout(jar, readingId), "failure");
    await settle(jar, await startMockCheckout(jar, readingId), "success");

    const events = await db.usageEvent.findMany({
      where: { readingId, name: { startsWith: "extended_" } },
      orderBy: { createdAt: "asc" },
    });
    const names = new Set(events.map((e) => e.name));
    for (const name of [
      "extended_offer_viewed",
      "extended_checkout_started",
      "extended_payment_failed",
      "extended_payment_success",
      "extended_reading_unlocked",
    ]) {
      expect(names).toContain(name);
    }
    for (const name of ["reading_started", "basic_reading_completed"]) {
      expect(await db.usageEvent.count({ where: { readingId, name } })).toBe(1);
    }
    const unlocked = events.find((e) => e.name === "extended_reading_unlocked")!;
    expect(unlocked.properties).toMatchObject({
      reading_id: readingId,
      price_inr: 35,
      currency: "INR",
      ai_provider: "mock",
      model: expect.any(String),
      is_demo: true, // mock AI and a sandbox payment
      guest: true,
      payment_provider: "MOCK",
    });
    const allProps = JSON.stringify(events.map((e) => e.properties));
    expect(allProps).not.toMatch(/@|email|password|cookie|guestKey/i);
  });
});
