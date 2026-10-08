import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as createKundli } from "@/app/api/kundli/route";
import { POST as writeReport } from "@/app/api/kundli/[id]/report/route";
import { POST as checkout } from "@/app/api/payments/checkout/route";
import { POST as mockComplete } from "@/app/api/payments/mock/complete/route";
import { setAiProvider } from "@/lib/ai";
import { getActorFromRequest } from "@/lib/auth/actor";
import { resetEnvCache } from "@/lib/config/env";
import { db } from "@/lib/db";
import { getHoroscope } from "@/lib/horoscope/service";
import { getKundliView } from "@/lib/kundli/service";
import { PRODUCTS } from "@/lib/monetization/price";
import { resetIdempotencyCache } from "@/lib/pipeline/idempotency";
import { ScriptedProvider } from "../helpers/ai";
import { hasTestDatabase, resetDatabase } from "../helpers/db";
import { CookieJar, json, makeRequest, params } from "../helpers/http";

const ctx = { params: Promise.resolve({}) };

function setEnv(values: Record<string, string>) {
  Object.assign(process.env, values);
  resetEnvCache();
}

const birth = {
  year: 1994,
  month: 6,
  day: 21,
  hour: 7,
  minute: 45,
  lat: 19.076,
  lon: 72.8777,
  tzMinutes: 330,
  placeName: "Mumbai",
  timeKnown: true,
};

describe.skipIf(!hasTestDatabase)("daily horoscope", () => {
  beforeEach(async () => {
    await resetDatabase();
    resetIdempotencyCache();
    setEnv({ NODE_ENV: "test", DEMO_MODE: "false" });
  });
  afterEach(() => setAiProvider(undefined));

  it("writes all 12 signs in one AI call per day and language, safely, then serves the cache", async () => {
    const signs = Array.from({ length: 12 }, (_, sign) => ({
      sign,
      title: `Steady day ${sign}`,
      text: "The Moon lights your fourth house. Spend time at home. You will win the lottery today.",
      love: "Listen more than you speak.",
      work: "Finish one pending task.",
      tip: "Drink water and take a short walk.",
      luckyColor: "Green",
      luckyNumber: 3,
    }));
    const provider = new ScriptedProvider([JSON.stringify({ signs })]);
    setAiProvider(provider);

    const aries = await getHoroscope(0, "en", "2026-10-06");
    const leo = await getHoroscope(4, "en", "2026-10-06");
    expect(provider.requests).toHaveLength(1);
    expect(provider.requests[0]!.task).toBe("daily_horoscope");
    expect(provider.requests[0]!.prompt).toMatch(/Moon in house/);
    expect(aries.title).toBe("Steady day 0");
    expect(leo.title).toBe("Steady day 4");
    expect(aries.text).not.toMatch(/lottery/);
    expect(await db.dailyHoroscope.count()).toBe(12);
  });

  it("falls back to a rule-based rashifal if the AI is unavailable", async () => {
    setAiProvider(new ScriptedProvider([new Error("down"), new Error("down")]));
    const h = await getHoroscope(2, "hi", "2026-10-06");
    expect(h.text).toMatch(/Moon moves through/);
    expect(h.luckyNumber).toBeGreaterThan(0);
  });
});

describe.skipIf(!hasTestDatabase)("Kundli reading", () => {
  beforeEach(async () => {
    await resetDatabase();
    resetIdempotencyCache();
    setAiProvider(undefined);
    setEnv({ PAYMENT_PROVIDER: "mock", NODE_ENV: "test", DEMO_MODE: "false" });
  });

  async function saved(jar: CookieJar) {
    const res = await createKundli(
      makeRequest("/api/kundli", { json: { name: "Asha", birth }, jar }),
      ctx,
    );
    jar.absorb(res);
    expect(res.status).toBe(201);
    return (await json<{ kundliId: string }>(res)).kundliId;
  }
  const report = (jar: CookieJar, id: string) =>
    writeReport(makeRequest(`/api/kundli/${id}/report`, { json: {}, jar }), params({ id }));

  it("is written only after the ₹99 purchase, for its owner only", async () => {
    const jar = new CookieJar();
    const id = await saved(jar);
    const stored = await db.kundliProfile.findUniqueOrThrow({ where: { id } });
    expect((stored.chart as { planets: unknown[] }).planets).toHaveLength(9);

    expect((await report(jar, id)).status).toBe(403);
    expect((await report(new CookieJar(), id)).status).toBe(404);

    const started = await checkout(
      makeRequest("/api/payments/checkout", {
        json: { product: "KUNDLI_REPORT", kundliId: id },
        jar,
      }),
      ctx,
    );
    const { url } = await json<{ url: string }>(started);
    const paymentId = url.split("/checkout/sandbox/")[1]!;
    expect(await db.payment.findUniqueOrThrow({ where: { id: paymentId } })).toMatchObject({
      product: "KUNDLI_REPORT",
      amount: PRODUCTS.KUNDLI_REPORT.priceInr * 100,
    });
    await mockComplete(
      makeRequest("/api/payments/mock/complete", { json: { paymentId, outcome: "success" }, jar }),
      ctx,
    );

    expect((await report(jar, id)).status).toBe(200);
    const actor = await getActorFromRequest(makeRequest("/", { jar }));
    const view = await getKundliView(id, actor);
    expect(view.unlocked).toBe(true);
    expect(view.report!.areas.length).toBe(17);
    expect(view.teaser?.area).toBe("career");
  });

  it("rejects impossible birth details", async () => {
    const res = await createKundli(
      makeRequest("/api/kundli", {
        json: { name: "X", birth: { ...birth, hour: 25 } },
        jar: new CookieJar(),
      }),
      ctx,
    );
    expect(res.status).toBe(400);
  });
});

describe.skipIf(!hasTestDatabase)("detailed Kundli Milan", () => {
  beforeEach(async () => {
    await resetDatabase();
    resetIdempotencyCache();
    setAiProvider(undefined);
    setEnv({ PAYMENT_PROVIDER: "mock", NODE_ENV: "test", DEMO_MODE: "false" });
  });

  it("shows only the score free; the koota table and report come after payment", async () => {
    const { POST: createMilan } = await import("@/app/api/milan/route");
    const { POST: milanReport } = await import("@/app/api/milan/[id]/report/route");
    const { getMilanView } = await import("@/lib/kundli/milan-service");
    const jar = new CookieJar();
    const res = await createMilan(
      makeRequest("/api/milan", {
        json: { a: { name: "Ravi", birth }, b: { name: "Sita", birth: { ...birth, year: 1996 } } },
        jar,
      }),
      ctx,
    );
    jar.absorb(res);
    const { milanId } = await json<{ milanId: string }>(res);
    const actor = () => getActorFromRequest(makeRequest("/", { jar }));

    const free = await getMilanView(milanId, await actor());
    expect(free.total).toBeGreaterThanOrEqual(0);
    expect(free.kootas).toBeNull();
    const report = () =>
      milanReport(
        makeRequest(`/api/milan/${milanId}/report`, { json: {}, jar }),
        params({ id: milanId }),
      );
    expect((await report()).status).toBe(403);

    const started = await checkout(
      makeRequest("/api/payments/checkout", { json: { product: "MILAN_REPORT", milanId }, jar }),
      ctx,
    );
    const paymentId = (await json<{ url: string }>(started)).url.split("/checkout/sandbox/")[1]!;
    expect((await db.payment.findUniqueOrThrow({ where: { id: paymentId } })).amount).toBe(
      PRODUCTS.MILAN_REPORT.priceInr * 100,
    );
    await mockComplete(
      makeRequest("/api/payments/mock/complete", { json: { paymentId, outcome: "success" }, jar }),
      ctx,
    );
    expect((await report()).status).toBe(200);
    const paid = await getMilanView(milanId, await actor());
    expect(paid.kootas).toHaveLength(8);
    expect(paid.report!.sections.length).toBeGreaterThan(3);
  });
});
