import "server-only";
import { getEnv } from "@/lib/config/env";
import { db } from "@/lib/db";
import { deleteReadingImages } from "@/lib/readings/service";

const DAY = 24 * 60 * 60 * 1000;

/**
 * Retention job:
 *  - guest readings (never claimed by an account) are deleted after
 *    IMAGE_RETENTION_DAYS, together with their photos;
 *  - photos of readings that never completed are removed after 1 day;
 *  - expired sessions are purged.
 */
export async function runCleanup(now = new Date()) {
  const retention = getEnv().IMAGE_RETENTION_DAYS;
  const guestCutoff = new Date(now.getTime() - retention * DAY);
  const staleCutoff = new Date(now.getTime() - DAY);

  const guestReadings = await db.reading.findMany({
    where: { userId: null, createdAt: { lt: guestCutoff } },
    select: { id: true, imageKey: true, thumbnailKey: true },
    take: 500,
  });
  for (const reading of guestReadings) await deleteReadingImages(reading);
  const deletedGuest = await db.reading.deleteMany({
    where: { id: { in: guestReadings.map((r) => r.id) } },
  });

  const stale = await db.reading.findMany({
    where: {
      status: { in: ["PENDING", "ANALYZING", "FAILED", "REJECTED"] },
      createdAt: { lt: staleCutoff },
      OR: [{ imageKey: { not: null } }, { thumbnailKey: { not: null } }],
    },
    select: { id: true, imageKey: true, thumbnailKey: true },
    take: 500,
  });
  for (const reading of stale) await deleteReadingImages(reading);
  await db.reading.updateMany({
    where: { id: { in: stale.map((r) => r.id) } },
    data: { imageKey: null, thumbnailKey: null, imageDeletedAt: now },
  });

  const sessions = await db.session.deleteMany({ where: { expiresAt: { lt: now } } });
  return {
    deletedGuestReadings: deletedGuest.count,
    clearedStaleImages: stale.length,
    expiredSessions: sessions.count,
  };
}
