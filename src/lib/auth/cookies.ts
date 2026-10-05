export const SESSION_COOKIE = "palmai_session";
export const GUEST_COOKIE = "palmai_guest";

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
export const GUEST_MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // 90 days

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Lax blocks the cookie on cross-site POSTs (CSRF) while keeping normal links working.
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
