import { NextResponse, type NextRequest } from "next/server";
import { LANGUAGE_CODES, LANGUAGE_COOKIE } from "@/lib/i18n/languages";
import { isSameOriginRequest, isUnsafeMethod } from "@/lib/security/same-origin";

/**
 * Runs before every matched request:
 *  1. CSRF: state-changing /api requests must come from our own origin.
 *     Payment webhooks and cron are server-to-server and authenticated by
 *     signatures / secrets instead.
 *  2. A strict, per-request nonce-based Content-Security-Policy for pages.
 */
const CSRF_EXEMPT = [/^\/api\/payments\/webhook\//, /^\/api\/cron\//];

function contentSecurityPolicy(nonce: string): string {
  const dev = process.env.NODE_ENV === "development";
  const razorpay = process.env.PAYMENT_PROVIDER === "razorpay";
  // Google Ad Manager rewarded ads (only when ADS_MODE=gam): GPT is loaded by our
  // nonce'd code ('strict-dynamic'), then serves creatives from Google domains.
  const ads = process.env.ADS_MODE === "gam";
  const adHosts = [
    "https://*.doubleclick.net",
    "https://*.googlesyndication.com",
    "https://*.google.com",
    "https://*.gstatic.com",
    "https://*.adtrafficquality.google",
  ];
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // 'strict-dynamic' lets our nonce'd scripts load their own chunks (and the
    // Razorpay checkout script) while blocking injected inline scripts.
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(dev ? ["'unsafe-eval'"] : []),
    ],
    // Inline style attributes are needed for dynamic widths/animation delays.
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "blob:", "data:", ...(ads ? ["https:"] : [])],
    "font-src": ["'self'"],
    "connect-src": [
      "'self'",
      ...(razorpay ? ["https://api.razorpay.com", "https://lumberjack.razorpay.com"] : []),
      ...(ads ? adHosts : []),
    ],
    "frame-src":
      razorpay || ads
        ? [
            ...(razorpay ? ["https://api.razorpay.com", "https://checkout.razorpay.com"] : []),
            ...(ads ? adHosts : []),
          ]
        : ["'none'"],
    "media-src": ["'self'", "blob:"],
    "worker-src": ["'self'"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  const policy = Object.entries(directives).map(([k, v]) => `${k} ${v.join(" ")}`);
  if (!dev) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    const exempt = CSRF_EXEMPT.some((re) => re.test(pathname));
    const allowed = process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : [];
    if (
      !exempt &&
      isUnsafeMethod(request.method) &&
      !isSameOriginRequest(request.headers, allowed)
    ) {
      return NextResponse.json(
        {
          error: {
            code: "CSRF_REJECTED",
            message: "This request was blocked for your security. Please refresh and try again.",
          },
        },
        { status: 403 },
      );
    }
    return NextResponse.next();
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  // Marketing links (e.g. /start?lang=hi from a Hindi Reel) choose the language
  // up front, so the visitor isn't asked again by the first-visit picker.
  const linkLang = request.nextUrl.searchParams.get("lang");
  const chooseLang =
    linkLang && LANGUAGE_CODES.includes(linkLang as never) && !request.cookies.get(LANGUAGE_COOKIE)
      ? linkLang
      : null;
  if (chooseLang) {
    const cookie = request.headers.get("cookie");
    requestHeaders.set("cookie", `${cookie ? `${cookie}; ` : ""}${LANGUAGE_COOKIE}=${chooseLang}`);
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  if (chooseLang) {
    response.cookies.set(LANGUAGE_COOKIE, chooseLang, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }
  return response;
}

export const config = {
  matcher: [
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|manifest.webmanifest|robots.txt|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
