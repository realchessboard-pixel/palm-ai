import "server-only";
import { db } from "@/lib/db";

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
  revenue: { currency: string; amount: number }[];
  readingsLast7Days: { day: string; count: number }[];
  recentActivity: { id: string; name: string; createdAt: string; signedIn: boolean }[];
}

const DAY = 24 * 60 * 60 * 1000;

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
    db.payment.groupBy({ by: ["currency"], where: { status: "PAID" }, _sum: { amount: true } }),
    db.usageEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      select: { id: true, name: true, createdAt: true, userId: true },
    }),
    db.reading.findMany({ where: { createdAt: { gte: since7 } }, select: { createdAt: true } }),
  ]);

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
    revenue: revenue.map((r) => ({ currency: r.currency, amount: r._sum.amount ?? 0 })),
    readingsLast7Days: [...byDay].map(([day, count]) => ({ day, count })),
    recentActivity: recent.map((e) => ({
      id: e.id,
      name: e.name,
      createdAt: e.createdAt.toISOString(),
      signedIn: e.userId !== null,
    })),
  };
}
