import "server-only";
import type { ProductKind } from "@prisma/client";
import type { AnalyticsEventName } from "@/lib/analytics/events";
import { db } from "@/lib/db";
import { computeEconomics, type Economics } from "@/lib/monetization/economics";

export interface AdminStats {
  totalUsers: number;
  totalReadings: number;
  completedReadings: number;
  premiumReadings: number;
  freeReadings: number;
  /** Premium / completed, 0–1. */
  conversionRate: number;
  aiErrors30d: number;
  rejectedPhotos30d: number;
  /** Verified real payments only — mock/test payments are never counted as revenue. */
  revenue: { currency: string; amount: number }[];
  /** Real revenue split by what was bought (wallet top-ups count when paid in, not when spent). */
  revenueByProduct: { product: ProductKind; currency: string; amount: number; count: number }[];
  /** Paid mock (sandbox) payments, shown separately. */
  testPayments: number;
  /** Detailed-reading funnel: distinct real (non-demo) readings reaching each step. */
  funnel: Record<FunnelStep, number>;
  economics: Economics;
  readingsLast7Days: { day: string; count: number }[];
  recentActivity: { id: string; name: string; createdAt: string; signedIn: boolean }[];
}

const DAY = 24 * 60 * 60 * 1000;

const FUNNEL_STEPS = [
  "reading_started",
  "basic_reading_completed",
  "extended_offer_viewed",
  "extended_checkout_started",
  "extended_payment_success",
  "extended_payment_failed",
  "extended_reading_unlocked",
] as const satisfies readonly AnalyticsEventName[];
type FunnelStep = (typeof FUNNEL_STEPS)[number];

/** Distinct readings with at least one real (non-demo) event of this name. */
async function funnelCount(name: FunnelStep): Promise<number> {
  const groups = await db.usageEvent.groupBy({
    by: ["readingId"],
    where: { name, readingId: { not: null }, properties: { path: ["is_demo"], equals: false } },
  });
  return groups.length;
}

/** Aggregate, non-identifying metrics for the admin dashboard. */
export async function getAdminStats(): Promise<AdminStats> {
  const since30 = new Date(Date.now() - 30 * DAY);
  const since7 = new Date(Date.now() - 7 * DAY);

  const [
    totalUsers,
    totalReadings,
    completedReadings,
    premiumGroups,
    aiErrors30d,
    rejectedPhotos30d,
    revenue,
    recent,
    lastWeek,
  ] = await Promise.all([
    db.user.count(),
    db.reading.count(),
    db.reading.count({ where: { status: "COMPLETE" } }),
    db.entitlement.groupBy({
      by: ["readingId"],
      where: { type: "READING_PREMIUM", revokedAt: null, readingId: { not: null } },
    }),
    db.usageEvent.count({ where: { name: "analysis_failed", createdAt: { gte: since30 } } }),
    db.usageEvent.count({ where: { name: "image_rejected", createdAt: { gte: since30 } } }),
    db.payment.groupBy({
      by: ["currency", "product"],
      where: { status: "PAID", provider: { notIn: ["MOCK", "WALLET"] } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    db.usageEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      select: { id: true, name: true, createdAt: true, userId: true },
    }),
    db.reading.findMany({ where: { createdAt: { gte: since7 } }, select: { createdAt: true } }),
  ]);

  const [testPayments, ...funnelCounts] = await Promise.all([
    db.payment.count({ where: { status: "PAID", provider: "MOCK" } }),
    ...FUNNEL_STEPS.map(funnelCount),
  ]);
  const funnel = Object.fromEntries(
    FUNNEL_STEPS.map((step, i) => [step, funnelCounts[i]!]),
  ) as Record<FunnelStep, number>;
  const realPurchases = revenue
    .filter((r) => r.product === "DETAILED_READING")
    .reduce((n, r) => n + r._count._all, 0);
  const byCurrency = new Map<string, number>();
  for (const r of revenue) {
    byCurrency.set(r.currency, (byCurrency.get(r.currency) ?? 0) + (r._sum.amount ?? 0));
  }

  const premiumReadings = premiumGroups.length;
  const byDay = new Map<string, number>();
  for (let i = 6; i >= 0; i--)
    byDay.set(new Date(Date.now() - i * DAY).toISOString().slice(0, 10), 0);
  for (const r of lastWeek) {
    const day = r.createdAt.toISOString().slice(0, 10);
    if (byDay.has(day)) byDay.set(day, byDay.get(day)! + 1);
  }

  return {
    totalUsers,
    totalReadings,
    completedReadings,
    premiumReadings,
    freeReadings: Math.max(0, completedReadings - premiumReadings),
    conversionRate: completedReadings ? premiumReadings / completedReadings : 0,
    aiErrors30d,
    rejectedPhotos30d,
    revenue: [...byCurrency].map(([currency, amount]) => ({ currency, amount })),
    revenueByProduct: revenue
      .map((r) => ({
        product: r.product,
        currency: r.currency,
        amount: r._sum.amount ?? 0,
        count: r._count._all,
      }))
      .sort((a, b) => b.amount - a.amount),
    testPayments,
    funnel,
    economics: computeEconomics({
      users: funnel.reading_started,
      basicReadings: funnel.basic_reading_completed,
      extendedPurchases: realPurchases,
    }),
    readingsLast7Days: [...byDay].map(([day, count]) => ({ day, count })),
    recentActivity: recent.map((e) => ({
      id: e.id,
      name: e.name,
      createdAt: e.createdAt.toISOString(),
      signedIn: e.userId !== null,
    })),
  };
}
