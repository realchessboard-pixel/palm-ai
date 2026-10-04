# Architecture

PalmAI is a single Next.js 16 application. Server components render pages, route handlers under `src/app/api` expose a small JSON API, and `src/lib` holds framework-agnostic services. Each external dependency (AI, storage, payments, rate limiting, analytics, auth) sits behind a narrow interface, so it can be swapped without touching business logic.

## Layers

```
┌──────────────────────────────────────────────────────────────────────────┐
│ UI (src/app pages, src/components)                                       │
│   server components: data loading, entitlement-projected views           │
│   client components: reading flow, camera, unlock, account actions       │
├──────────────────────────────────────────────────────────────────────────┤
│ HTTP (src/app/api/**/route.ts) — thin: rate limit → validate (Zod) →     │
│   call a service → JSON. Wrapped by withErrorHandling (friendly errors). │
├──────────────────────────────────────────────────────────────────────────┤
│ Services (src/lib)                                                       │
│   pipeline/   analyze (stage 1) · interpret (stage 2) · grounding · safety│
│   readings/   ownership, views, projection (free vs premium)             │
│   payments/   checkout, fulfilment, webhooks                             │
│   auth/       sessions, actor (user | guest), accounts                   │
│   palmistry/  knowledge rules + deterministic composer                   │
├──────────────────────────────────────────────────────────────────────────┤
│ Adapters                                                                  │
│   ai/providers/*   storage/*   payments/providers/*   security/rate-limit │
│   analytics/server   db (Prisma)                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

`src/proxy.ts` runs in front of everything. It applies the per-request CSP nonce to pages and the same-origin (CSRF) check to state-changing API requests.

## Request flows

### Creating a reading

1. **Browser** (`components/reading-flow`): the user picks a hand, then captures (`getUserMedia`, only after an explicit tap) or chooses a photo. `lib/image/client-image.ts` decodes it with EXIF orientation, computes quality metrics on a 512px grayscale copy, and re-encodes a ≤1600px JPEG.
2. `POST /api/palm/analyze` (multipart) runs `analyzePalm()`:
   - sniffs the real file type, decodes it with a pixel limit, re-encodes it (dropping metadata), makes a thumbnail, and re-runs the quality gate (`lib/image/process.ts`);
   - resolves the AI provider _before_ storing anything;
   - stores the image and thumbnail under random keys, then creates a `Reading` row with status `ANALYZING`;
   - runs stage 1 and validates the result. A rejected photo becomes `REJECTED` and its images are deleted; any error becomes `FAILED` and its images are deleted.
3. `POST /api/palm/interpret` runs `interpretReading()`:
   - claims the reading atomically (`ANALYZED → INTERPRETING`), so it is concurrency-safe;
   - runs stage 2, then the grounding and safety filters, then re-validates and saves (`COMPLETE`). On failure it returns to `ANALYZED`, so it can be retried.
4. `/readings/[id]` loads the reading and checks ownership. It then checks entitlements and renders a **projected** view.

### Status machine

```
PENDING → ANALYZING ─┬─▶ ANALYZED ─▶ INTERPRETING ─┬─▶ COMPLETE
                     ├─▶ REJECTED (photo deleted)  └─▶ ANALYZED (retry)
                     └─▶ FAILED   (photo deleted)
```

### Ownership: users and guests

An `Actor` is `{ user, guestKeyHash }`.

- Anonymous visitors get a random 256-bit `palmai_guest` cookie. Readings store only its SHA-256.
- On signup or login, `claimGuestReadings` moves that browser's guest readings to the account.
- `canAccessReading` is the single authorization rule. Foreign readings return **404**, not 403, so ids can't be enumerated.

### Free vs premium (entitlements)

- `PalmInterpretation.data` always stores the **full** reading.
- `lib/readings/projection.ts` decides what leaves the server. For a free viewer it keeps:
  - the overview;
  - the summaries of Personality and Career;
  - the summaries of the heart, head and life lines.

  Everything else is **removed**, and only a list of locked item _names_ is sent, so the UI can describe what the full report contains.

- `lib/entitlements.ts` checks for an active `READING_PREMIUM` entitlement on the reading, or a `PREMIUM_SUBSCRIPTION` on its owner. Subscriptions are architecture for later.
- The PDF route renders only for premium readings.

### Payments

```
UnlockButton → POST /api/payments/checkout → startCheckout()
   ├─ creates Payment(PENDING) → provider.createCheckout()
   ├─ Stripe: redirect to Checkout → success_url → confirmStripeReturn() (server-side check)
   ├─ Razorpay: order → Checkout.js → POST /api/payments/razorpay/verify (HMAC)
   └─ Mock: fulfil immediately (dev/test only)
Webhooks → /api/payments/webhook/{stripe,razorpay} → handleWebhook()
   verify signature → idempotency check (ProcessedWebhookEvent) → fulfillPayment()
fulfillPayment(): transaction · amount/currency match · PAID · grant Entitlement (unique per payment)
```

## Data model (Prisma)

| Model                   | Notes                                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `User`                  | email (unique), scrypt `passwordHash`, `role`, `trainingOptIn`                                                    |
| `Session`               | `tokenHash` (unique), expiry, `lastUsedAt`; cascades with the user                                                |
| `Reading`               | owner (`userId` or `guestKeyHash`), hand, status, private image keys, confidence, `isDemo`, `trainingOptIn`       |
| `PalmAnalysis`          | validated stage-1 JSON + prompt version, provider, model and attempts                                             |
| `PalmInterpretation`    | validated stage-2 JSON (full) + how many statements the filters removed                                           |
| `Payment`               | provider, `providerRef` (unique), amount and currency in minor units, status; kept (detached) on account deletion |
| `Entitlement`           | `READING_PREMIUM` or `PREMIUM_SUBSCRIPTION`; `paymentId` unique, so fulfilment is idempotent                      |
| `UsageEvent`            | allow-listed, non-identifying analytics events                                                                    |
| `ProcessedWebhookEvent` | webhook idempotency                                                                                               |

## Adapters and how to swap them

| Concern       | Interface                                      | Implementations                 | Selected by                                    |
| ------------- | ---------------------------------------------- | ------------------------------- | ---------------------------------------------- |
| AI            | `AiProvider` (`lib/ai/types.ts`)               | anthropic, openai, gemini, mock | `AI_PROVIDER`                                  |
| Storage       | `ObjectStorage` (`lib/storage/types.ts`)       | local, s3, memory               | `STORAGE_PROVIDER`                             |
| Payments      | `PaymentProvider` (`lib/payments/types.ts`)    | stripe, razorpay, mock          | `PAYMENT_PROVIDER`                             |
| Rate limiting | `RateLimiter` (`lib/security/rate-limit.ts`)   | in-memory                       | `setRateLimiter()` (plug in Redis/Upstash)     |
| Analytics     | `trackServerEvent` (`lib/analytics/server.ts`) | database, console, none         | `ANALYTICS_PROVIDER`                           |
| Auth          | `lib/auth/session.ts` + `lib/auth/actor.ts`    | built-in sessions               | Replace these two modules for Auth.js/Supabase |

**Moving to Auth.js or Supabase Auth.** Route handlers only call `getActorFromRequest()`, `getActor()`, `requireUser()` and `requireAdmin()`. Re-implement those functions on top of the new provider's session, keeping `SessionUser` as the shape. Everything else is untouched.

## Error handling

- `AppError(code)` carries a user-safe message and HTTP status. `withErrorHandling` converts anything thrown into `{ error: { code, message, details? } }`:
  - Zod errors become field-level `VALIDATION_ERROR`;
  - Prisma errors become `DATABASE_ERROR`;
  - anything else becomes `INTERNAL_ERROR`.
- Technical details go to the structured server logger (`lib/logger.ts`), with keys that look like secrets redacted. They are never returned to clients.
- UI: `app/error.tsx` and `app/global-error.tsx` show friendly boundaries. Client fetches go through `lib/api-client.ts`, which turns network failures into a friendly message.

## Security controls (summary)

| Threat                     | Control                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| XSS                        | Nonce CSP + `strict-dynamic`; model output rendered as text; no user HTML                         |
| CSRF                       | SameSite=Lax cookies + Origin/Sec-Fetch-Site check in `proxy.ts`                                  |
| Clickjacking               | `frame-ancestors 'none'`, `X-Frame-Options: DENY`                                                 |
| IDOR                       | Ownership check on every reading access; 404 on mismatch                                          |
| Malicious uploads          | Magic-byte sniffing, size and pixel limits, full re-encode, generated keys, path-traversal guards |
| Webhook forgery and replay | HMAC verification, timestamp tolerance (Stripe), idempotency table, amount/currency checks        |
| Credential stuffing        | Rate limits per IP and per email; uniform login errors and timing                                 |
| Secret exposure            | `server-only` modules; env validated server-side; no secrets in `NEXT_PUBLIC_*`                   |
| Data retention             | Cleanup job for guest readings and failed uploads; user-initiated deletion everywhere             |

## Front end

- Tailwind 4 tokens live in `src/app/globals.css`: night palette, gold accent and the aura violet.
- All illustrations are inline SVG built from one palm geometry (`components/palm/palm-geometry.ts`), mirrored for right hands.
- Mobile-first layouts with a minimum 44px touch target. The full journey has been checked at 390px and 1280px+ with no horizontal overflow.
- The PWA consists of `app/manifest.ts`, `public/sw.js` and `/offline`. The service worker is network-first for pages and cache-first for hashed static assets, and it never caches `/api/*`, photos or reports.
