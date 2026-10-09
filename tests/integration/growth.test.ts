import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as signup } from "@/app/api/auth/signup/route";
import { POST as createCompatibility } from "@/app/api/compatibility/route";
import { POST as generateCompatibility } from "@/app/api/compatibility/[id]/generate/route";
import { POST as redeem } from "@/app/api/gifts/redeem/route";
import { POST as analyze } from "@/app/api/palm/analyze/route";
import { POST as interpret } from "@/app/api/palm/interpret/route";
import { POST as checkout } from "@/app/api/payments/checkout/route";
import { POST as mockComplete } from "@/app/api/payments/mock/complete/route";
import { POST as payFromWallet } from "@/app/api/payments/wallet/route";
import { GET as getReading } from "@/app/api/readings/[id]/route";
import { POST as unlockWithCredit } from "@/app/api/readings/[id]/unlock/route";
import { getAdminStats } from "@/lib/admin/stats";
import { setAiProvider } from "@/lib/ai";
import { getActorFromRequest } from "@/lib/auth/actor";
import { getCompatibilityView } from "@/lib/compatibility/service";
import { resetEnvCache } from "@/lib/config/env";
import { db } from "@/lib/db";
import { getAccountBalances, listGiftsBought } from "@/lib/monetization/account";
import { composeRuleBasedReading } from "@/lib/palmistry/interpretation";
import { sampleAnalysis } from "@/lib/palmistry/sample-analysis";
import { resetIdempotencyCache } from "@/lib/pipeline/idempotency";
import { listReadingsForUser } from "@/lib/readings/service";
import type { ReadingView } from "@/lib/readings/view";
import { ScriptedProvider, teaserJson } from "../helpers/ai";
import { hasTestDatabase, resetDatabase } from "../helpers/db";
import { CookieJar, json, makeRequest, params } from "../helpers/http";
import { palmLikeImage } from "../helpers/images";

const ctx = { params: Promise.resolve({}) };

function setEnv(values: Record<string, string>) {
  Object.assign(process.env, values);
  resetEnvCache();
}

async function signUp(email: string, ref?: string) {
  const jar = new CookieJar();
  const res = await signup(
    makeRequest("/api/auth/signup", { json: { email, password: "a-strong-password", ref } }),
    ctx,
  );
  expect(res.status).toBe(201);
  jar.absorb(res);
  const user = await db.user.findUniqueOrThrow({ where: { email } });
  return { jar, userId: user.id };
}

async function analyzed(jar: CookieJar, extra: Record<string, string> = {}) {
  const form = new FormData();
  form.set(
    "image",
    new Blob([new Uint8Array(await palmLikeImage())], { type: "image/jpeg" }),
    "p.jpg",
  );
  form.set("consent", "true");
  for (const [k, v] of Object.entries(extra)) form.set(k, v);
  const res = await analyze(
    makeRequest("/api/palm/analyze", { method: "POST", body: form, jar }),
    ctx,
  );
  jar.absorb(res);
  return { status: res.status, body: await json<{ readingId: string }>(res) };
}

async function completedReading(jar: CookieJar) {
  const { body } = await analyzed(jar);
  const done = await interpret(
    makeRequest("/api/palm/interpret", { json: { readingId: body.readingId }, jar }),
    ctx,
  );
  expect(done.status).toBe(200);
  return body.readingId;
}

async function buy(jar: CookieJar, order: Record<string, unknown>) {
  const res = await checkout(makeRequest("/api/payments/checkout", { json: order, jar }), ctx);
  const body = await json<{ type: string; url?: string; error?: { code: string } }>(res);
  if (res.status !== 200) return { status: res.status, body };
  const paymentId = body.url!.split("/checkout/sandbox/")[1]!;
  const settled = await mockComplete(
    makeRequest("/api/payments/mock/complete", { json: { paymentId, outcome: "success" }, jar }),
    ctx,
  );
  return { status: settled.status, body, paymentId };
}

async function premium(readingId: string, jar: CookieJar) {
  const res = await getReading(
    makeRequest(`/api/readings/${readingId}`, { jar }),
    params({ id: readingId }),
  );
  return (await json<{ reading: ReadingView }>(res)).reading.premium;
}

const unlock = (jar: CookieJar, readingId: string) =>
  unlockWithCredit(
    makeRequest(`/api/readings/${readingId}/unlock`, { json: {}, jar }),
    params({ id: readingId }),
  );

describe.skipIf(!hasTestDatabase)("packs, wallet, gifts and membership", () => {
  beforeEach(async () => {
    await resetDatabase();
    resetIdempotencyCache();
    setAiProvider(undefined);
    setEnv({ PAYMENT_PROVIDER: "mock", NODE_ENV: "test", DEMO_MODE: "false" });
  });
  afterEach(() => setAiProvider(undefined));

  it("account products need a (free) account", async () => {
    const guest = new CookieJar();
    await completedReading(guest);
    const res = await buy(guest, { product: "FAMILY_PACK" });
    expect(res.status).toBe(401);
    expect(await db.payment.count()).toBe(0);
  });

  it("a family pack adds 4 credits once; each credit unlocks one reading, once", async () => {
    const { jar, userId } = await signUp("family@example.com");
    const { paymentId } = await buy(jar, { product: "FAMILY_PACK" });
    expect((await getAccountBalances(userId)).readingCredits).toBe(4);
    // Settling the same checkout again grants nothing more.
    const replay = await mockComplete(
      makeRequest("/api/payments/mock/complete", { json: { paymentId, outcome: "success" }, jar }),
      ctx,
    );
    expect(replay.status).toBe(409);
    expect((await getAccountBalances(userId)).readingCredits).toBe(4);

    const readingId = await completedReading(jar);
    expect(await premium(readingId, jar)).toBe(false);
    expect((await unlock(jar, readingId)).status).toBe(200);
    expect(await premium(readingId, jar)).toBe(true);
    expect((await unlock(jar, readingId)).status).toBe(200); // already unlocked: no charge
    expect((await getAccountBalances(userId)).readingCredits).toBe(3);
  });

  it("can't unlock with a credit you don't have, or someone else's reading", async () => {
    const a = await signUp("a@example.com");
    const b = await signUp("b@example.com");
    const readingA = await completedReading(a.jar);
    expect((await unlock(a.jar, readingA)).status).toBe(402);
    await buy(b.jar, { product: "FAMILY_PACK" });
    expect((await unlock(b.jar, readingA)).status).toBe(404);
    expect(await premium(readingA, a.jar)).toBe(false);
  });

  it("charges the wallet only once when the same purchase is tapped twice at once", async () => {
    const { jar, userId } = await signUp("double@example.com");
    await buy(jar, { product: "WALLET_TOPUP", payInr: 100 });
    const readingId = await completedReading(jar);
    const pay = () =>
      payFromWallet(
        makeRequest("/api/payments/wallet", {
          json: { product: "DETAILED_READING", readingId },
          jar,
        }),
        ctx,
      );
    const results = await Promise.all([pay(), pay(), pay()]);
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect((await getAccountBalances(userId)).walletPaise).toBe(11000 - 4900);
    expect(await db.payment.count({ where: { provider: "WALLET" } })).toBe(1);
    expect(await db.usageEvent.count({ where: { name: "wallet_payment" } })).toBe(1);
  });

  it("spends one credit only when unlock is tapped twice at once", async () => {
    const { jar, userId } = await signUp("credit@example.com");
    await buy(jar, { product: "FAMILY_PACK" });
    const before = (await getAccountBalances(userId)).readingCredits;
    const readingId = await completedReading(jar);
    const results = await Promise.all([unlock(jar, readingId), unlock(jar, readingId)]);
    expect(results.map((r) => r.status)).toEqual([200, 200]);
    expect((await getAccountBalances(userId)).readingCredits).toBe(before - 1);
    expect(await premium(readingId, jar)).toBe(true);
  });

  it("wallet top-ups add the bonus; wallet spends are not counted as revenue twice", async () => {
    const { jar, userId } = await signUp("wallet@example.com");
    await buy(jar, { product: "WALLET_TOPUP", payInr: 100 });
    expect((await getAccountBalances(userId)).walletPaise).toBe(11000);
    // Amounts outside the catalogue are rejected.
    expect((await buy(jar, { product: "WALLET_TOPUP", payInr: 1 })).status).toBe(400);

    const readingId = await completedReading(jar);
    const paid = await payFromWallet(
      makeRequest("/api/payments/wallet", {
        json: { product: "DETAILED_READING", readingId },
        jar,
      }),
      ctx,
    );
    expect(paid.status).toBe(200);
    expect(await premium(readingId, jar)).toBe(true);
    expect((await getAccountBalances(userId)).walletPaise).toBe(11000 - 4900);

    // Not enough for a membership: nothing is charged or granted.
    const tooMuch = await payFromWallet(
      makeRequest("/api/payments/wallet", { json: { product: "MEMBERSHIP_YEAR" }, jar }),
      ctx,
    );
    expect(tooMuch.status).toBe(402);
    expect((await getAccountBalances(userId)).walletPaise).toBe(6100);
    expect((await getAccountBalances(userId)).membershipUntil).toBeNull();

    // Mock (sandbox) payments are never revenue; only the wallet spend is excluded here too.
    await db.payment.updateMany({ where: { provider: "MOCK" }, data: { provider: "RAZORPAY" } });
    const stats = await getAdminStats();
    expect(stats.revenue).toEqual([{ currency: "inr", amount: 10000 }]);
    expect(stats.revenueByProduct).toEqual([
      { product: "WALLET_TOPUP", currency: "inr", amount: 10000, count: 1 },
    ]);
    expect(stats.growth.walletLiabilityPaise).toBe(6100);
  });

  it("a gift code can be shared, redeemed once by someone else, and unlocks a reading", async () => {
    const giver = await signUp("giver@example.com");
    await buy(giver.jar, { product: "GIFT_READING" });
    const [gift] = await listGiftsBought(giver.userId);
    expect(gift!.code).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);

    const friend = await signUp("friend@example.com");
    const redeemRes = (jar: CookieJar, code: string) =>
      redeem(makeRequest("/api/gifts/redeem", { json: { code }, jar }), ctx);
    expect((await redeemRes(friend.jar, gift!.code.toLowerCase())).status).toBe(200);
    expect((await redeemRes(friend.jar, gift!.code)).status).toBe(404);
    expect((await redeemRes(giver.jar, gift!.code)).status).toBe(404);
    expect((await getAccountBalances(friend.userId)).readingCredits).toBe(1);
    expect((await listGiftsBought(giver.userId))[0]!.redeemed).toBe(true);

    const readingId = await completedReading(friend.jar);
    expect((await unlock(friend.jar, readingId)).status).toBe(200);
    expect(await premium(readingId, friend.jar)).toBe(true);
  });

  it("membership unlocks every reading for a year, and renewing extends it", async () => {
    const { jar, userId } = await signUp("member@example.com");
    const before = await completedReading(jar);
    await buy(jar, { product: "MEMBERSHIP_YEAR" });
    const first = new Date((await getAccountBalances(userId)).membershipUntil!);
    expect(first.getTime() - Date.now()).toBeGreaterThan(364 * 86_400_000);
    expect(await premium(before, jar)).toBe(true);
    expect(await premium(await completedReading(jar), jar)).toBe(true);

    await buy(jar, { product: "MEMBERSHIP_YEAR" });
    const renewed = new Date((await getAccountBalances(userId)).membershipUntil!);
    expect(renewed.getTime() - first.getTime()).toBeGreaterThan(364 * 86_400_000);
  });
});

describe.skipIf(!hasTestDatabase)("referrals", () => {
  beforeEach(async () => {
    await resetDatabase();
    resetIdempotencyCache();
    setEnv({ PAYMENT_PROVIDER: "mock", NODE_ENV: "test", DEMO_MODE: "false" });
  });
  afterEach(() => setAiProvider(undefined));

  const realReadingProvider = () =>
    new ScriptedProvider([
      JSON.stringify(sampleAnalysis("right")),
      teaserJson(composeRuleBasedReading(sampleAnalysis("right")).narrative!),
    ]);

  it("3 friends who join and read their palm earn the referrer one credit, once", async () => {
    const referrer = await signUp("referrer@example.com");
    const code = (
      await db.user.update({
        where: { id: referrer.userId },
        data: { referralCode: "REFER234" },
      })
    ).referralCode!;

    // Self-referral and unknown codes are ignored.
    await signUp("nobody@example.com", "ZZZZZZZZ");
    expect(await db.referral.count()).toBe(0);

    for (const n of [1, 2, 3]) {
      const friend = await signUp(`friend${n}@example.com`, code.toLowerCase());
      setAiProvider(realReadingProvider());
      await completedReading(friend.jar);
    }
    expect(await db.referral.count({ where: { qualifiedAt: { not: null } } })).toBe(3);
    expect((await getAccountBalances(referrer.userId)).readingCredits).toBe(1);

    // Another reading by a friend changes nothing.
    const again = await db.user.findUniqueOrThrow({ where: { email: "friend1@example.com" } });
    const { qualifyReferral } = await import("@/lib/growth/referrals");
    await qualifyReferral(again.id);
    expect((await getAccountBalances(referrer.userId)).readingCredits).toBe(1);
  });

  it("demo (sample) readings never qualify a referral", async () => {
    const referrer = await signUp("ref2@example.com");
    await db.user.update({ where: { id: referrer.userId }, data: { referralCode: "DEMO2345" } });
    const friend = await signUp("demo-friend@example.com", "DEMO2345");
    await completedReading(friend.jar); // default mock provider: demo reading
    expect(await db.referral.findFirstOrThrow()).toMatchObject({
      referredId: friend.userId,
      qualifiedAt: null,
    });
  });
});

describe.skipIf(!hasTestDatabase)("couple compatibility", () => {
  beforeEach(async () => {
    await resetDatabase();
    resetIdempotencyCache();
    setAiProvider(undefined);
    setEnv({ PAYMENT_PROVIDER: "mock", NODE_ENV: "test", DEMO_MODE: "false" });
  });
  afterEach(() => setAiProvider(undefined));

  async function couple(jar: CookieJar) {
    const readingId = await completedReading(jar);
    const partner = await analyzed(jar, { role: "partner", partnerConsent: "true" });
    expect(partner.status).toBe(201);
    const res = await createCompatibility(
      makeRequest("/api/compatibility", {
        json: { readingId, partnerReadingId: partner.body.readingId },
        jar,
      }),
      ctx,
    );
    expect(res.status).toBe(201);
    const { compatibilityId } = await json<{ compatibilityId: string }>(res);
    return { readingId, partnerReadingId: partner.body.readingId, compatibilityId };
  }

  const generate = (jar: CookieJar, id: string) =>
    generateCompatibility(
      makeRequest(`/api/compatibility/${id}/generate`, { json: {}, jar }),
      params({ id }),
    );

  it("needs the partner's agreement, and their photo is never used for training", async () => {
    const jar = new CookieJar();
    expect((await analyzed(jar, { role: "partner" })).status).toBe(400);
    const ok = await analyzed(jar, {
      role: "partner",
      partnerConsent: "true",
      trainingOptIn: "true",
    });
    const stored = await db.reading.findUniqueOrThrow({ where: { id: ok.body.readingId } });
    expect(stored).toMatchObject({ role: "PARTNER", trainingOptIn: false });
  });

  it("is written only after the ₹99 unlock, and only for its owner", async () => {
    const { jar, userId } = await signUp("couple@example.com");
    const { compatibilityId, partnerReadingId } = await couple(jar);

    expect((await generate(jar, compatibilityId)).status).toBe(403);
    const stranger = new CookieJar();
    await completedReading(stranger);
    expect((await generate(stranger, compatibilityId)).status).toBe(404);

    const payment = await buy(jar, { product: "COUPLE_COMPATIBILITY", compatibilityId });
    expect(payment.status).toBe(200);
    expect(await db.payment.findFirstOrThrow()).toMatchObject({
      product: "COUPLE_COMPATIBILITY",
      amount: 9900,
    });
    expect((await generate(jar, compatibilityId)).status).toBe(200);

    const actor = await getActorFromRequest(makeRequest("/", { jar }));
    const view = await getCompatibilityView(compatibilityId, actor);
    expect(view).toMatchObject({ unlocked: true, status: "COMPLETE", isDemo: true });
    expect(view.reading!.parts.length).toBeGreaterThan(0);
    // The partner's palm stays out of the user's own reading list.
    const listed = await listReadingsForUser(userId);
    expect(listed.map((r) => r.id)).not.toContain(partnerReadingId);
  });

  it("an AI couple reading keeps only grounded, safe passages", async () => {
    const jar = new CookieJar();
    setAiProvider(
      new ScriptedProvider([
        JSON.stringify(sampleAnalysis("right")),
        teaserJson(composeRuleBasedReading(sampleAnalysis("right")).narrative!),
        JSON.stringify(sampleAnalysis("right")),
        JSON.stringify({
          headline: "Two steady hands",
          introduction:
            "Your palms show a quiet warmth. You two will marry within a year. Your compatibility score is 92%.",
          parts: [
            {
              id: "minds",
              text: "Your Mastishka Rekha and your partner's both run long. Traditionally this is read as shared curiosity.",
              basedOn: ["you.lines.head", "partner.lines.head"],
            },
            {
              id: "hearts",
              text: "A strong Mangal dosha suggests remedies. Your hearts meet warmly.",
              basedOn: ["you.lines.heart", "partner.lines.heart"],
            },
            { id: "growth", text: "Cited nothing real.", basedOn: ["partner.markings.9"] },
          ],
          strengths: [
            { name: "Curiosity", text: "You both love ideas.", basedOn: ["you.lines.head"] },
            { name: "Warmth", text: "You care openly.", basedOn: ["partner.lines.heart"] },
            { name: "Patience", text: "You give each other time.", basedOn: ["you.lines.life"] },
          ],
          reflection: null,
        }),
      ]),
    );
    const readingId = await completedReading(jar);
    const partner = await analyzed(jar, { role: "partner", partnerConsent: "true" });
    const created = await createCompatibility(
      makeRequest("/api/compatibility", {
        json: { readingId, partnerReadingId: partner.body.readingId },
        jar,
      }),
      ctx,
    );
    const { compatibilityId } = await json<{ compatibilityId: string }>(created);
    await buy(jar, { product: "COUPLE_COMPATIBILITY", compatibilityId });
    expect((await generate(jar, compatibilityId)).status).toBe(200);

    const stored = await db.compatibility.findUniqueOrThrow({ where: { id: compatibilityId } });
    const text = JSON.stringify(stored.data);
    expect(text).not.toMatch(/marry|score|92%|dosha|remed/i);
    expect(text).toContain("shared curiosity");
    expect(text).toContain("Your hearts meet warmly.");
    expect(text).not.toContain("Cited nothing real");
  });
});
