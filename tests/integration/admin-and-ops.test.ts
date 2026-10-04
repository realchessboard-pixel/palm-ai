import { beforeEach, describe, expect, it } from "vitest";
import { POST as signup } from "@/app/api/auth/signup/route";
import { GET as cleanup } from "@/app/api/cron/cleanup/route";
import { POST as trackEvent } from "@/app/api/events/route";
import { getAdminStats } from "@/lib/admin/stats";
import { getActorFromRequest } from "@/lib/auth/actor";
import { resetEnvCache } from "@/lib/config/env";
import { db } from "@/lib/db";
import { hasTestDatabase, resetDatabase } from "../helpers/db";
import { CookieJar, makeRequest } from "../helpers/http";

const ctx = { params: Promise.resolve({}) };

describe.skipIf(!hasTestDatabase)("admin, analytics and maintenance", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("grants admin only to configured accounts", async () => {
    const admin = new CookieJar();
    admin.absorb(
      await signup(
        makeRequest("/api/auth/signup", {
          json: { email: "admin@example.com", password: "a long password" },
          jar: admin,
        }),
        ctx,
      ),
    );
    const member = new CookieJar();
    member.absorb(
      await signup(
        makeRequest("/api/auth/signup", {
          json: { email: "member@example.com", password: "a long password" },
          jar: member,
        }),
        ctx,
      ),
    );
    expect((await getActorFromRequest(makeRequest("/", { jar: admin }))).user?.isAdmin).toBe(true);
    expect((await getActorFromRequest(makeRequest("/", { jar: member }))).user?.isAdmin).toBe(
      false,
    );
  });

  it("computes aggregate stats", async () => {
    const user = await db.user.create({ data: { email: "x@example.com", passwordHash: "x" } });
    const r1 = await db.reading.create({
      data: { hand: "LEFT", status: "COMPLETE", userId: user.id },
    });
    await db.reading.create({ data: { hand: "RIGHT", status: "COMPLETE" } });
    await db.reading.create({ data: { hand: "RIGHT", status: "FAILED" } });
    const payment = await db.payment.create({
      data: { provider: "MOCK", amount: 499, currency: "usd", status: "PAID", readingId: r1.id },
    });
    await db.entitlement.create({
      data: { type: "READING_PREMIUM", readingId: r1.id, paymentId: payment.id },
    });
    await db.usageEvent.create({ data: { name: "analysis_failed" } });

    const stats = await getAdminStats();
    expect(stats).toMatchObject({
      totalUsers: 1,
      totalReadings: 3,
      completedReadings: 2,
      premiumReadings: 1,
      freeReadings: 1,
      conversionRate: 0.5,
      aiErrors30d: 1,
      revenue: [{ currency: "usd", amount: 499 }],
    });
    expect(stats.readingsLast7Days).toHaveLength(7);
    expect(stats.readingsLast7Days.at(-1)!.count).toBe(3);
  });

  it("accepts allow-listed client events and refuses server-only ones", async () => {
    const ok = await trackEvent(
      makeRequest("/api/events", {
        json: { name: "landing_page_view", properties: { ref: "home" } },
      }),
      ctx,
    );
    expect(ok.status).toBe(204);
    const spoofed = await trackEvent(
      makeRequest("/api/events", { json: { name: "purchase_completed" } }),
      ctx,
    );
    expect(spoofed.status).toBe(400);
    const pii = await trackEvent(
      makeRequest("/api/events", {
        json: { name: "start_reading", properties: { email: "x".repeat(100) } },
      }),
      ctx,
    );
    expect(pii.status).toBe(400);
    expect(await db.usageEvent.count()).toBe(1);
  });

  it("protects the cleanup job and enforces retention", async () => {
    process.env.CRON_SECRET = "cron-secret-value";
    resetEnvCache();
    try {
      expect((await cleanup(makeRequest("/api/cron/cleanup"), ctx)).status).toBe(401);
      expect(
        (
          await cleanup(
            makeRequest("/api/cron/cleanup", { headers: { authorization: "Bearer wrong" } }),
            ctx,
          )
        ).status,
      ).toBe(401);

      const old = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
      await db.reading.create({
        data: { hand: "LEFT", status: "COMPLETE", guestKeyHash: "a".repeat(64), createdAt: old },
      });
      const user = await db.user.create({ data: { email: "keep@example.com", passwordHash: "x" } });
      await db.reading.create({
        data: { hand: "LEFT", status: "COMPLETE", userId: user.id, createdAt: old },
      });
      await db.reading.create({
        data: { hand: "LEFT", status: "COMPLETE", guestKeyHash: "b".repeat(64) },
      });

      const res = await cleanup(
        makeRequest("/api/cron/cleanup", {
          headers: { authorization: "Bearer cron-secret-value" },
        }),
        ctx,
      );
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ deletedGuestReadings: 1 });
      expect(await db.reading.count()).toBe(2);
    } finally {
      delete process.env.CRON_SECRET;
      resetEnvCache();
    }
  });
});
