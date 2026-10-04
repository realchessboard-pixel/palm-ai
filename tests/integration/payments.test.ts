import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as analyze } from "@/app/api/palm/analyze/route";
import { POST as interpret } from "@/app/api/palm/interpret/route";
import { POST as checkout } from "@/app/api/payments/checkout/route";
import { POST as razorpayVerify } from "@/app/api/payments/razorpay/verify/route";
import { POST as razorpayWebhook } from "@/app/api/payments/webhook/razorpay/route";
import { POST as stripeWebhook } from "@/app/api/payments/webhook/stripe/route";
import { GET as getReading } from "@/app/api/readings/[id]/route";
import { GET as getReport } from "@/app/api/readings/[id]/report/route";
import { resetEnvCache } from "@/lib/config/env";
import { db } from "@/lib/db";
import { hasPremiumAccess } from "@/lib/entitlements";
import { hmacSha256Hex } from "@/lib/payments/signatures";
import type { ReadingView } from "@/lib/readings/view";
import { hasTestDatabase, resetDatabase } from "../helpers/db";
import { CookieJar, json, makeRequest, params } from "../helpers/http";
import { palmLikeImage } from "../helpers/images";

const ctx = { params: Promise.resolve({}) };

async function completedReading(jar: CookieJar): Promise<string> {
  const form = new FormData();
  form.set(
    "image",
    new Blob([new Uint8Array(await palmLikeImage())], { type: "image/jpeg" }),
    "p.jpg",
  );
  form.set("hand", "left");
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

function setEnv(values: Record<string, string>) {
  Object.assign(process.env, values);
  resetEnvCache();
}

function stripeEvent(id: string, type: string, session: Record<string, unknown>) {
  const body = JSON.stringify({ id, type, data: { object: session } });
  const t = Math.floor(Date.now() / 1000);
  const signature = hmacSha256Hex("whsec_test_secret", `${t}.${body}`);
  return makeRequest("/api/payments/webhook/stripe", {
    method: "POST",
    body,
    headers: { "stripe-signature": `t=${t},v1=${signature}`, "content-type": "application/json" },
  });
}

describe.skipIf(!hasTestDatabase)("payments and entitlements", () => {
  beforeEach(async () => {
    await resetDatabase();
    setEnv({ PAYMENT_PROVIDER: "mock" });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    setEnv({ PAYMENT_PROVIDER: "mock" });
  });

  it("unlocks premium content only after a completed payment", async () => {
    const jar = new CookieJar();
    const readingId = await completedReading(jar);
    const before = await view(readingId, jar);
    expect(before.premium).toBe(false);
    expect(before.interpretation!.mounts).toEqual([]);

    const forbidden = await getReport(
      makeRequest(`/api/readings/${readingId}/report`, { jar }),
      params({ id: readingId }),
    );
    expect(forbidden.status).toBe(403);

    const res = await checkout(
      makeRequest("/api/payments/checkout", { json: { readingId }, jar }),
      ctx,
    );
    expect(await json(res)).toEqual({ type: "completed" });

    const after = await view(readingId, jar);
    expect(after.premium).toBe(true);
    expect(after.locked).toBeNull();
    expect(after.interpretation!.mounts.length).toBeGreaterThan(0);
    expect(after.interpretation!.sections.every((s) => s.details)).toBe(true);
    expect(await db.payment.count({ where: { status: "PAID" } })).toBe(1);
    expect(await db.usageEvent.count({ where: { name: "purchase_completed" } })).toBe(1);

    const report = await getReport(
      makeRequest(`/api/readings/${readingId}/report`, { jar }),
      params({ id: readingId }),
    );
    expect(report.status).toBe(200);
    expect(report.headers.get("content-type")).toBe("application/pdf");
    const bytes = Buffer.from(await report.arrayBuffer());
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");

    // Buying again doesn't create a second charge.
    const again = await checkout(
      makeRequest("/api/payments/checkout", { json: { readingId }, jar }),
      ctx,
    );
    expect(await json(again)).toEqual({ type: "completed" });
    expect(await db.payment.count()).toBe(1);
  });

  it("does not let anyone buy or read entitlements for someone else's reading", async () => {
    const owner = new CookieJar();
    const readingId = await completedReading(owner);
    const res = await checkout(
      makeRequest("/api/payments/checkout", { json: { readingId }, jar: new CookieJar() }),
      ctx,
    );
    expect(res.status).toBe(404);
    expect(await hasPremiumAccess({ readingId, ownerUserId: null })).toBe(false);
  });

  it("ignores revoked and expired entitlements", async () => {
    const jar = new CookieJar();
    const readingId = await completedReading(jar);
    await db.entitlement.create({
      data: { type: "READING_PREMIUM", readingId, revokedAt: new Date() },
    });
    await db.entitlement.create({
      data: { type: "READING_PREMIUM", readingId, expiresAt: new Date(Date.now() - 1000) },
    });
    expect((await view(readingId, jar)).premium).toBe(false);
  });

  it("reports payments as unavailable when no provider is configured", async () => {
    setEnv({ PAYMENT_PROVIDER: "none" });
    const jar = new CookieJar();
    const readingId = await completedReading(jar);
    const res = await checkout(
      makeRequest("/api/payments/checkout", { json: { readingId }, jar }),
      ctx,
    );
    expect(res.status).toBe(503);
  });

  describe("Stripe", () => {
    beforeEach(() => setEnv({ PAYMENT_PROVIDER: "stripe", STRIPE_SECRET_KEY: "sk_test_x" }));

    async function startStripeCheckout(jar: CookieJar, readingId: string) {
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "cs_test_123",
            url: "https://checkout.stripe.com/c/pay/cs_test_123",
          }),
        ),
      );
      const res = await checkout(
        makeRequest("/api/payments/checkout", { json: { readingId }, jar }),
        ctx,
      );
      const [url, init] = fetchMock.mock.calls[0];
      fetchMock.mockRestore();
      return { res, url: String(url), init: init as RequestInit };
    }

    it("creates a Checkout session server-side and fulfils it from a verified webhook", async () => {
      const jar = new CookieJar();
      const readingId = await completedReading(jar);
      const { res, url, init } = await startStripeCheckout(jar, readingId);
      expect(await json(res)).toEqual({
        type: "redirect",
        url: "https://checkout.stripe.com/c/pay/cs_test_123",
      });
      expect(url).toBe("https://api.stripe.com/v1/checkout/sessions");
      expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk_test_x");
      const form = new URLSearchParams(String(init.body));
      expect(form.get("line_items[0][price_data][unit_amount]")).toBe("499");
      expect(form.get("metadata[readingId]")).toBe(readingId);

      const session = {
        id: "cs_test_123",
        payment_status: "paid",
        amount_total: 499,
        currency: "usd",
      };
      const hook = await stripeWebhook(
        stripeEvent("evt_1", "checkout.session.completed", session),
        ctx,
      );
      expect(hook.status).toBe(200);
      expect((await view(readingId, jar)).premium).toBe(true);

      // Re-delivery of the same event is a no-op.
      const dup = await stripeWebhook(
        stripeEvent("evt_1", "checkout.session.completed", session),
        ctx,
      );
      expect(await json(dup)).toMatchObject({ status: "duplicate" });
      expect(await db.entitlement.count()).toBe(1);
    });

    it("rejects webhooks with an invalid signature", async () => {
      const jar = new CookieJar();
      const readingId = await completedReading(jar);
      await startStripeCheckout(jar, readingId);
      const body = JSON.stringify({
        id: "evt_forged",
        type: "checkout.session.completed",
        data: {
          object: { id: "cs_test_123", payment_status: "paid", amount_total: 499, currency: "usd" },
        },
      });
      const res = await stripeWebhook(
        makeRequest("/api/payments/webhook/stripe", {
          method: "POST",
          body,
          headers: {
            "stripe-signature": `t=${Math.floor(Date.now() / 1000)},v1=${"a".repeat(64)}`,
          },
        }),
        ctx,
      );
      expect(res.status).toBe(400);
      expect((await view(readingId, jar)).premium).toBe(false);
    });

    it("refuses to fulfil when the paid amount doesn't match", async () => {
      const jar = new CookieJar();
      const readingId = await completedReading(jar);
      await startStripeCheckout(jar, readingId);
      const session = {
        id: "cs_test_123",
        payment_status: "paid",
        amount_total: 1,
        currency: "usd",
      };
      await stripeWebhook(stripeEvent("evt_2", "checkout.session.completed", session), ctx);
      expect((await view(readingId, jar)).premium).toBe(false);
      expect((await db.payment.findFirstOrThrow()).status).toBe("FAILED");
    });

    it("marks expired sessions as failed", async () => {
      const jar = new CookieJar();
      const readingId = await completedReading(jar);
      await startStripeCheckout(jar, readingId);
      await stripeWebhook(
        stripeEvent("evt_3", "checkout.session.expired", { id: "cs_test_123" }),
        ctx,
      );
      expect((await db.payment.findFirstOrThrow()).status).toBe("FAILED");
    });

    it("surfaces provider errors as a friendly payment error", async () => {
      const jar = new CookieJar();
      const readingId = await completedReading(jar);
      vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 500 }));
      const res = await checkout(
        makeRequest("/api/payments/checkout", { json: { readingId }, jar }),
        ctx,
      );
      expect(res.status).toBe(402);
      expect((await json<{ error: { message: string } }>(res)).error.message).not.toMatch(
        /Stripe HTTP/,
      );
      expect((await db.payment.findFirstOrThrow()).status).toBe("FAILED");
    });
  });

  describe("Razorpay", () => {
    beforeEach(() => setEnv({ PAYMENT_PROVIDER: "razorpay" }));

    async function startOrder(jar: CookieJar, readingId: string) {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ id: "order_ABC", amount: 499, currency: "USD" })),
      );
      const res = await checkout(
        makeRequest("/api/payments/checkout", { json: { readingId }, jar }),
        ctx,
      );
      vi.restoreAllMocks();
      return json<{ type: string; orderId: string; keyId: string }>(res);
    }

    it("creates an order and verifies the checkout signature", async () => {
      const jar = new CookieJar();
      const readingId = await completedReading(jar);
      const order = await startOrder(jar, readingId);
      expect(order).toMatchObject({
        type: "razorpay",
        orderId: "order_ABC",
        keyId: "rzp_test_key",
      });
      expect(JSON.stringify(order)).not.toContain("rzp_test_secret");

      const bad = await razorpayVerify(
        makeRequest("/api/payments/razorpay/verify", {
          json: { orderId: "order_ABC", paymentId: "pay_1", signature: "b".repeat(64) },
          jar,
        }),
        ctx,
      );
      expect(bad.status).toBe(402);
      expect((await view(readingId, jar)).premium).toBe(false);

      const signature = hmacSha256Hex("rzp_test_secret", "order_ABC|pay_1");
      const ok = await razorpayVerify(
        makeRequest("/api/payments/razorpay/verify", {
          json: { orderId: "order_ABC", paymentId: "pay_1", signature },
          jar,
        }),
        ctx,
      );
      expect(ok.status).toBe(200);
      expect((await view(readingId, jar)).premium).toBe(true);
    });

    it("fulfils from a signed webhook and rejects unsigned ones", async () => {
      const jar = new CookieJar();
      const readingId = await completedReading(jar);
      await startOrder(jar, readingId);
      const body = JSON.stringify({
        event: "payment.captured",
        payload: {
          payment: { entity: { id: "pay_9", order_id: "order_ABC", amount: 499, currency: "USD" } },
        },
      });
      const unsigned = await razorpayWebhook(
        makeRequest("/api/payments/webhook/razorpay", { method: "POST", body }),
        ctx,
      );
      expect(unsigned.status).toBe(400);

      const signed = await razorpayWebhook(
        makeRequest("/api/payments/webhook/razorpay", {
          method: "POST",
          body,
          headers: {
            "x-razorpay-signature": hmacSha256Hex("rzp_webhook_secret", body),
            "x-razorpay-event-id": "rzp_evt_1",
          },
        }),
        ctx,
      );
      expect(signed.status).toBe(200);
      expect((await view(readingId, jar)).premium).toBe(true);
    });
  });
});
