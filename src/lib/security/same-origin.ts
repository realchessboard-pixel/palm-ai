/**
 * CSRF defence for cookie-authenticated, state-changing requests.
 *
 * Browsers always send `Origin` on cross-origin POST/PUT/PATCH/DELETE, and
 * `Sec-Fetch-Site` on modern engines. We reject the request if either says it
 * came from another site. Combined with SameSite=Lax cookies this blocks
 * cross-site request forgery without per-form tokens. Non-browser clients
 * (no Origin, no Sec-Fetch-Site) carry no ambient cookies, so they're allowed.
 *
 * Edge-safe: no Node APIs, so it can run in src/proxy.ts.
 */
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function isUnsafeMethod(method: string): boolean {
  return UNSAFE_METHODS.has(method.toUpperCase());
}

export function isSameOriginRequest(headers: Headers, allowedOrigins: string[] = []): boolean {
  const fetchSite = headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") return false;

  const origin = headers.get("origin");
  if (!origin) return true;
  if (origin === "null") return false;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const host = headers.get("x-forwarded-host")?.split(",")[0].trim() || headers.get("host");
  if (host && originHost === host) return true;
  return allowedOrigins.some((allowed) => {
    try {
      return new URL(allowed).host === originHost;
    } catch {
      return false;
    }
  });
}
