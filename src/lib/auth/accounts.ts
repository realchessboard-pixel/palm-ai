import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/http/errors";
import { deleteReadingImages } from "@/lib/readings/service";
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from "./crypto";
import { toSessionUser, type SessionUser } from "./session";

export async function registerUser(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<SessionUser> {
  const passwordHash = await hashPassword(input.password);
  try {
    const user = await db.user.create({
      data: { email: input.email, passwordHash, name: input.name || null },
    });
    return toSessionUser(user);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError("CONFLICT", {
        message: "An account with this email already exists. Try signing in instead.",
      });
    }
    throw error;
  }
}

const INVALID_LOGIN = "That email and password combination didn't match.";

export async function authenticate(email: string, password: string): Promise<SessionUser> {
  const user = await db.user.findUnique({ where: { email } });
  // Always run the hash comparison so response time doesn't reveal whether the email exists.
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (!user || !valid) throw new AppError("UNAUTHORIZED", { message: INVALID_LOGIN });
  return toSessionUser(user);
}

/** Delete every reading (and its images) belonging to a user, keeping the account. */
export async function deleteAllUserReadings(userId: string): Promise<number> {
  const readings = await db.reading.findMany({
    where: { userId },
    select: { id: true, imageKey: true, thumbnailKey: true },
  });
  for (const reading of readings) await deleteReadingImages(reading);
  const ids = readings.map((r) => r.id);
  await db.reading.deleteMany({ where: { id: { in: ids } } });
  await db.usageEvent.updateMany({ where: { readingId: { in: ids } }, data: { readingId: null } });
  return readings.length;
}

/**
 * Permanently delete an account and all personal data. Payment records are
 * kept (detached from the user) because financial records must be retained.
 */
export async function deleteAccount(userId: string): Promise<void> {
  await deleteAllUserReadings(userId);
  await db.usageEvent.updateMany({ where: { userId }, data: { userId: null } });
  await db.user.delete({ where: { id: userId } });
}
