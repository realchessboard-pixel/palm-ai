import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getEnv } from "@/lib/config/env";
import { AppError, withErrorHandling } from "@/lib/http/errors";
import { runCleanup } from "@/lib/maintenance/cleanup";

function authorized(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Scheduled data-retention job (Vercel Cron sends `Authorization: Bearer $CRON_SECRET`). */
export const GET = withErrorHandling("cron.cleanup", async (request: NextRequest) => {
  if (!authorized(request.headers.get("authorization"), getEnv().CRON_SECRET)) {
    throw new AppError("UNAUTHORIZED");
  }
  return NextResponse.json(await runCleanup());
});
