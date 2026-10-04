import "server-only";
import type { NextRequest } from "next/server";
import { AppError } from "@/lib/http/errors";

/**
 * Rate limiting behind an interface. The default in-memory fixed-window
 * limiter protects a single instance; on serverless platforms with many
 * instances, plug in a shared store (e.g. Upstash Redis) implementing
 * `RateLimiter` via `setRateLimiter`.
 */
export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

export interface RateLimiter {
  limit(key: string, max: number, windowMs: number): Promise<RateLimitResult>;
}

export class MemoryRateLimiter implements RateLimiter {
  private buckets = new Map<string, { count: number; resetAt: number }>();
  private lastSweep = Date.now();

  async limit(key: string, max: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    this.sweep(now);
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return { success: true, remaining: max - 1, resetAt: now + windowMs };
    }
    bucket.count += 1;
    return {
      success: bucket.count <= max,
      remaining: Math.max(0, max - bucket.count),
      resetAt: bucket.resetAt,
    };
  }

  reset(): void {
    this.buckets.clear();
  }

  private sweep(now: number) {
    if (now - this.lastSweep < 60_000) return;
    this.lastSweep = now;
    for (const [key, bucket] of this.buckets) if (bucket.resetAt <= now) this.buckets.delete(key);
  }
}

let limiter: RateLimiter = new MemoryRateLimiter();

export function setRateLimiter(next: RateLimiter): void {
  limiter = next;
}

export function getRateLimiter(): RateLimiter {
  return limiter;
}

/** Named policies so limits are tuned in one place. */
export const RATE_LIMITS = {
  analyze: { max: 10, windowMs: 60 * 60 * 1000 },
  interpret: { max: 20, windowMs: 60 * 60 * 1000 },
  auth: { max: 10, windowMs: 15 * 60 * 1000 },
  checkout: { max: 20, windowMs: 60 * 60 * 1000 },
  events: { max: 120, windowMs: 60 * 1000 },
  general: { max: 120, windowMs: 60 * 1000 },
} as const;

export function clientIp(request: NextRequest | Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Throws RATE_LIMITED when the key has exceeded the policy. */
export async function enforceRateLimit(
  policy: keyof typeof RATE_LIMITS,
  key: string,
): Promise<void> {
  const { max, windowMs } = RATE_LIMITS[policy];
  const result = await limiter.limit(`${policy}:${key}`, max, windowMs);
  if (!result.success) {
    throw new AppError("RATE_LIMITED", {
      details: { retryAfter: Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000)) },
    });
  }
}
