import "server-only";

/**
 * Collapses duplicate submissions of one request (a double tap, or a retry
 * after a dropped connection) onto a single pipeline run, so the user isn't
 * charged a second AI call or left with two readings. Keys are scoped to the
 * actor, so one person's result is never returned to another.
 *
 * In-memory and per-instance, like the default rate limiter; the database
 * claim in the interpretation step remains the cross-instance guard.
 */
const TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 5_000;

const entries = new Map<string, { promise: Promise<unknown>; expires: number }>();

export function runOnce<T>(
  scope: string | null,
  requestId: string | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  if (!scope || !requestId) return fn();
  const now = Date.now();
  // Entries are inserted in expiry order, so expired ones sit at the front.
  for (const [key, entry] of entries) {
    if (entry.expires > now) break;
    entries.delete(key);
  }

  const key = `${scope}:${requestId}`;
  const existing = entries.get(key);
  if (existing) return existing.promise as Promise<T>;

  if (entries.size >= MAX_ENTRIES) entries.delete(entries.keys().next().value!);
  const promise = fn();
  entries.set(key, { promise, expires: now + TTL_MS });
  // Failures aren't remembered: an explicit retry should run again.
  promise.catch(() => {
    if (entries.get(key)?.promise === promise) entries.delete(key);
  });
  return promise;
}

export function resetIdempotencyCache(): void {
  entries.clear();
}
