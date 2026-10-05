import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as analyze } from "@/app/api/palm/analyze/route";
import { POST as interpret } from "@/app/api/palm/interpret/route";
import { POST as cancel } from "@/app/api/payments/cancel/route";
import { POST as checkout } from "@/app/api/payments/checkout/route";
import { POST as verify } from "@/app/api/payments/razorpay/verify/route";
import { POST as webhook } from "@/app/api/payments/webhook/razorpay/route";
import { GET as getReading } from "@/app/api/readings/[id]/route";
import { GET as getReport } from "@/app/api/readings/[id]/report/route";
import { resetEnvCache } from "@/lib/config/env";
import { db } from "@/lib/db";
import { hmacSha256Hex } from "@/lib/payments/signatures";
import type { ReadingView } from "@/lib/readings/view";
import { hasTestDatabase, resetDatabase } from "../helpers/db";
import { CookieJar, json, makeRequest, params } from "../helpers/http";
import { palmLikeImage } from "../helpers/images";

const ctx = { params: Promise.resolve({}) };
const KEY_SECRET = "rzp_test_secret";
const WEBHOOK_SECRET = "rzp_webhook_secret";

function setEnv(values: Record<string, string>) {
  Object.assign(process.env, values);
  resetEnvCache();
}

async function completedReading(jar: CookieJar) {
  const form = new FormData();
  form.set(
    "image",
    new Blob([new Uint8Array(await palmLikeImage())], { type: "image/jpeg" }),
    "p.jpg",
  );
  form.set("hand", "right");
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

async function view(readingId: string, jar: CookieJar) {
  const res = await getReading(
    makeRequest(`/api/readings/${readingId}`, { jar }),
    params({ id: readingId }),
  );
  return (await json<{ reading: ReadingView }>(res)).reading;
}

/** Stub Razorpay's REST API: order creation and payment lookups. */
function razorpayApi(payments: Record<string, Record<string, unknown>> = {}) {
  let orderSeq = 0;
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    if (url === "https://api.razorpay.com/v1/orders") {
      const body = JSON.parse(String(init!.body));
      return new Response(
        JSON.stringify({ id: `order_${++orderSeq}`, amount: body.amount, currency: body.currency }),
      );
    }
    const match = url.match(/\/v1\/payments\/([^/]+)$/);
    if (match && payments[match[1]!]) return new Response(JSON.stringify(payments[match[1]!]));
    return new Response("{}", { status: 404 });
  });
}

async function startOrder(jar: CookieJar, readingId: string) {
  const res = await checkout(
    makeRequest("/api/payments/checkout", { json: { readingId }, jar }),
    ctx,
  );
  expect(res.status).toBe(200);
  return json<{ type: string; orderId: string; amount: number; currency: string; keyId: string }>(
    res,
  );
}

function verifyRequest(jar: CookieJar, orderId: string, paymentId: string, secret = KEY_SECRET) {
  return verify(
    makeRequest("/api/payments/razorpay/verify", {
      json: { orderId, paymentId, signature: hmacSha256Hex(secret, `${orderId}|${paymentId}`) },
      jar,
    }),
    ctx,
  );
}

function webhookRequest(
  eventId: string,
  event: string,
  payment: { id: string; order_id: string; amount?: number; currency?: string },
  secret = WEBHOOK_SECRET,
) {
  const body = JSON.stringify({
    entity: "event",
    event,
    payload: {
      payment: { entity: { amount: 3500, currency: "INR", ...payment } },
      ...(event === "order.paid"
        ? { order: { entity: { id: payment.order_id, amount: 3500, currency: "INR" } } }
        : {}),
    },
  });
  return webhook(
    makeRequest("/api/payments/webhook/razorpay", {
      method: "POST",
      body,
      headers: {
        "content-type": "application/json",
        "x-razorpay-signature": hmacSha256Hex(secret, body),
        "x-razorpay-event-id": eventId,
      },
    }),
    ctx,
  );
}

const reportStatus = async (readingId: string, jar: CookieJar) =>
  (
    await getReport(
      makeRequest(`/api/readings/${readingId}/report`, { jar }),
      params({ id: readingId }),
    )
  ).status;

describe.skipIf(!hasTestDatabase)("Razorpay ₹35 checkout", () => {
  beforeEach(async () => {
    await resetDatabase();
    setEnv({ PAYMENT_PROVIDER: "razorpay" });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    setEnv({ PAYMENT_PROVIDER: "mock" });
  });

  it("creates a ₹35 INR order server-side with only the public key id sent to the browser", async () => {
    const api = razorpayApi();
    const jar = new CookieJar();
    const readingId = await completedReading(jar);
    const order = await startOrder(jar, readingId);
    expect(order).toMatchObject({ type: "razorpay", amount: 3500, currency: "INR" });
    expect(order.keyId).toBe("rzp_test_key");
    expect(JSON.stringify(order)).not.toContain(KEY_SECRET);
    const [, init] = api.mock.calls.find(([u]) => String(u).endsWith("/v1/orders"))!;
    expect(JSON.parse(String(init!.body))).toMatchObject({
      amount: 3500,
      currency: "INR",
      notes: { readingId },
    });
    expect(await db.payment.findFirstOrThrow()).toMatchObject({
      provider: "RAZORPAY",
      providerRef: order.orderId,
      status: "PENDING",
      amount: 3500,
      currency: "inr",
    });
    expect((await view(readingId, jar)).premium).toBe(false);
  });

  it("successful payment: unlocks only after the signature AND Razorpay's own record check out", async () => {
    razorpayApi({
      pay_ok: {
        id: "pay_ok",
        order_id: "order_1",
        status: "captured",
        amount: 3500,
        currency: "INR",
      },
    });
    const jar = new CookieJar();
    const readingId = await completedReading(jar);
    await startOrder(jar, readingId);

    const forged = await verifyRequest(jar, "order_1", "pay_ok", "wrong_secret");
    expect(forged.status).toBe(402);
    expect((await view(readingId, jar)).premium).toBe(false);

    const ok = await verifyRequest(jar, "order_1", "pay_ok");
    expect(await json(ok)).toEqual({ status: "paid" });
    const reading = await view(readingId, jar);
    expect(reading).toMatchObject({ premium: true, paymentState: "PAYMENT_SUCCESS" });
    expect(reading.interpretation!.mounts.length).toBeGreaterThan(0);
    expect(await reportStatus(readingId, jar)).toBe(200);
  });

  it("a valid signature is not enough if Razorpay reports a different amount or an uncaptured payment", async () => {
    razorpayApi({
      pay_cheap: {
        id: "pay_cheap",
        order_id: "order_1",
        status: "captured",
        amount: 100,
        currency: "INR",
      },
      pay_auth: {
        id: "pay_auth",
        order_id: "order_2",
        status: "authorized",
        amount: 3500,
        currency: "INR",
      },
    });
    const jar = new CookieJar();
    const a = await completedReading(jar);
    const b = await completedReading(jar);
    await startOrder(jar, a);
    await startOrder(jar, b);

    expect((await verifyRequest(jar, "order_1", "pay_cheap")).status).toBe(402);
    expect((await view(a, jar)).premium).toBe(false);

    // Authorized but not captured: stays locked until the capture webhook arrives.
    expect(await json(await verifyRequest(jar, "order_2", "pay_auth"))).toEqual({
      status: "pending",
    });
    expect((await view(b, jar)).premium).toBe(false);
    expect(
      (await webhookRequest("evt_cap", "payment.captured", { id: "pay_auth", order_id: "order_2" }))
        .status,
    ).toBe(200);
    expect((await view(b, jar)).premium).toBe(true);
  });

  it("successful payment confirmed by webhook alone (browser closed before the callback)", async () => {
    razorpayApi();
    const jar = new CookieJar();
    const readingId = await completedReading(jar);
    await startOrder(jar, readingId);
    const res = await webhookRequest("evt_1", "payment.captured", {
      id: "pay_1",
      order_id: "order_1",
    });
    expect(await json(res)).toMatchObject({ status: "processed" });
    expect((await view(readingId, jar)).premium).toBe(true);
  });

  it("rejects unsigned or wrongly signed webhooks", async () => {
    razorpayApi();
    const jar = new CookieJar();
    const readingId = await completedReading(jar);
    await startOrder(jar, readingId);
    const bad = await webhookRequest(
      "evt_x",
      "payment.captured",
      { id: "pay_1", order_id: "order_1" },
      "nope",
    );
    expect(bad.status).toBe(400);
    expect((await view(readingId, jar)).premium).toBe(false);
  });

  it("failed payment keeps the reading locked (webhook and checkout callback)", async () => {
    razorpayApi({
      pay_bad: {
        id: "pay_bad",
        order_id: "order_1",
        status: "failed",
        amount: 3500,
        currency: "INR",
      },
    });
    const jar = new CookieJar();
    const readingId = await completedReading(jar);
    await startOrder(jar, readingId);
    await webhookRequest("evt_f", "payment.failed", { id: "pay_bad", order_id: "order_1" });
    expect(await view(readingId, jar)).toMatchObject({
      premium: false,
      paymentState: "PAYMENT_FAILED",
    });
    expect((await verifyRequest(jar, "order_1", "pay_bad")).status).toBe(402);
    expect((await view(readingId, jar)).premium).toBe(false);
    expect(await reportStatus(readingId, jar)).toBe(403);
    expect(await db.entitlement.count()).toBe(0);

    // A retry on the same order that succeeds still unlocks (real money moved).
    await webhookRequest("evt_ok", "payment.captured", { id: "pay_retry", order_id: "order_1" });
    expect((await view(readingId, jar)).premium).toBe(true);
  });

  it("cancelled payment (window closed) keeps the reading locked", async () => {
    razorpayApi();
    const jar = new CookieJar();
    const readingId = await completedReading(jar);
    await startOrder(jar, readingId);
    expect(
      (await cancel(makeRequest("/api/payments/cancel", { json: { readingId }, jar }), ctx)).status,
    ).toBe(200);
    expect(await view(readingId, jar)).toMatchObject({
      premium: false,
      paymentState: "PAYMENT_CANCELLED",
    });
    expect(await reportStatus(readingId, jar)).toBe(403);
  });

  it("webhook replay and duplicate deliveries grant exactly one entitlement", async () => {
    razorpayApi();
    const jar = new CookieJar();
    const readingId = await completedReading(jar);
    await startOrder(jar, readingId);
    const payment = { id: "pay_1", order_id: "order_1" };

    expect(await json(await webhookRequest("evt_1", "payment.captured", payment))).toMatchObject({
      status: "processed",
    });
    // Same delivery replayed.
    expect(await json(await webhookRequest("evt_1", "payment.captured", payment))).toMatchObject({
      status: "duplicate",
    });
    // Razorpay also sends order.paid for the same payment, under a different event id.
    expect((await webhookRequest("evt_2", "order.paid", payment)).status).toBe(200);
    // A captured body re-sent with a fresh event id (the id header isn't signed).
    expect((await webhookRequest("evt_3", "payment.captured", payment)).status).toBe(200);

    expect(await db.entitlement.count()).toBe(1);
    expect(await db.payment.count({ where: { status: "PAID" } })).toBe(1);
    expect(await db.usageEvent.count({ where: { name: "extended_reading_unlocked" } })).toBe(1);
  });

  it("refreshing after a successful payment keeps it unlocked and never charges again", async () => {
    razorpayApi({
      pay_ok: {
        id: "pay_ok",
        order_id: "order_1",
        status: "captured",
        amount: 3500,
        currency: "INR",
      },
    });
    const jar = new CookieJar();
    const readingId = await completedReading(jar);
    await startOrder(jar, readingId);
    await verifyRequest(jar, "order_1", "pay_ok");
    // The webhook arriving after the callback is a no-op.
    await webhookRequest("evt_late", "payment.captured", { id: "pay_ok", order_id: "order_1" });
    // The callback fired twice (e.g. a refresh mid-flow) is also a no-op.
    expect(await json(await verifyRequest(jar, "order_1", "pay_ok"))).toEqual({ status: "paid" });

    for (let i = 0; i < 3; i++) expect((await view(readingId, jar)).premium).toBe(true);
    const again = await checkout(
      makeRequest("/api/payments/checkout", { json: { readingId }, jar }),
      ctx,
    );
    expect(await json(again)).toEqual({ type: "completed" });
    expect(await db.payment.count()).toBe(1);
    expect(await db.entitlement.count()).toBe(1);
  });

  it("payment for Reading A can never unlock Reading B", async () => {
    razorpayApi({
      pay_A: {
        id: "pay_A",
        order_id: "order_1",
        status: "captured",
        amount: 3500,
        currency: "INR",
      },
    });
    const jar = new CookieJar();
    const readingA = await completedReading(jar);
    const readingB = await completedReading(jar);
    await startOrder(jar, readingA); // order_1
    await startOrder(jar, readingB); // order_2

    // A's payment presented against B's order: signature doesn't match B's order.
    expect((await verifyRequest(jar, "order_2", "pay_A", "x")).status).toBe(402);
    // Correctly signed for B's order, but Razorpay says pay_A belongs to order_1.
    expect((await verifyRequest(jar, "order_2", "pay_A")).status).toBe(402);
    expect((await view(readingB, jar)).premium).toBe(false);

    // A's real payment and webhook unlock A only.
    await verifyRequest(jar, "order_1", "pay_A");
    await webhookRequest("evt_A", "payment.captured", { id: "pay_A", order_id: "order_1" });
    expect((await view(readingA, jar)).premium).toBe(true);
    expect((await view(readingB, jar)).premium).toBe(false);
    expect(await db.entitlement.findMany({ select: { readingId: true } })).toEqual([
      { readingId: readingA },
    ]);

    // Someone else can't confirm A's order.
    expect((await verifyRequest(new CookieJar(), "order_1", "pay_A")).status).toBe(404);
  });

  it("flags Razorpay test-mode payments as demo in analytics", async () => {
    razorpayApi();
    const jar = new CookieJar();
    const readingId = await completedReading(jar);
    await startOrder(jar, readingId);
    await webhookRequest("evt_1", "payment.captured", { id: "pay_1", order_id: "order_1" });
    const unlocked = await db.usageEvent.findFirstOrThrow({
      where: { name: "extended_reading_unlocked" },
    });
    expect(unlocked.properties).toMatchObject({ payment_provider: "RAZORPAY", is_demo: true });
  });
});
