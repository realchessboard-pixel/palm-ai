# PalmAI

A mobile-first AI palmistry web app. Users photograph or upload their palm and receive a reading grounded in the features an AI vision model could actually see, interpreted through traditional palmistry.

> **For entertainment, cultural and personal-reflection purposes only.** Palmistry isn't scientifically validated. PalmAI never makes medical, lifespan, pregnancy, criminality, legal or guaranteed-financial claims, and its confidence score measures **image analysis**, not the truth of any prediction.

---

## Contents

- [Features](#features)
- [How it works](#how-it-works)
- [Tech stack](#tech-stack)
- [Local development](#local-development)
- [Environment variables](#environment-variables)
- [Database setup](#database-setup)
- [AI provider setup](#ai-provider-setup)
- [Payment setup](#payment-setup)
- [Deployment](#deployment)
- [Security & privacy](#security--privacy)
- [Testing](#testing)
- [Project structure](#project-structure)
- [Roadmap](#roadmap)

More detail: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/AI_PIPELINE.md`](docs/AI_PIPELINE.md).

## Features

**Reading journey**

- Landing page with hero, three-step explainer, features, example reading, privacy section, FAQ (with `FAQPage` structured data) and disclaimer.
- Left/right hand selection, then a live camera with a palm-shaped guide and tips (permission is only requested when the user taps **Take photo**), a gallery picker, or desktop drag and drop.
- In-browser quality checks before upload: file type, size, resolution, darkness, overexposure, blur, and a soft "palm not found" hint. The image is downscaled and re-encoded in the browser, which strips EXIF.
- Server-side re-validation: magic-byte sniffing, decode limits, metadata-stripping re-encode, and the same quality thresholds.
- A two-stage AI pipeline. Stage 1 extracts observable features as strict JSON; stage 2 interprets only those features (details in [How it works](#how-it-works)).
- A progress experience whose wording is honest about which steps are real.
- A results dashboard showing:
  - image analysis confidence;
  - a palm diagram, plus your own photo with approximate line markers;
  - major findings and per-line readings;
  - Personality, Love & Relationships, Career, Money & Success, Life Path, Strengths, Challenges and Highlights sections, each with a feature-emphasis score and the features it is "based on".
- A public sample report at `/example`.

**Accounts and monetization**

- Free tier: personality summary, heart, head and life line basics, and a career summary.
- Premium (one-time unlock per reading): every section in full, the fate line, mounts, fingers and thumb, markings, and a downloadable PDF.
- Entitlements are checked on the server. Locked content is never sent to the browser.
- Stripe Checkout and Razorpay Orders behind a provider abstraction, with signature-verified, idempotent webhooks.
- Email/password accounts: sign up, log in, log out, a **Your Readings** dashboard with thumbnails, deleting a reading, "delete my data", and deleting the account.
- Guest readings are tied to an anonymous cookie and adopted automatically when the visitor signs up or logs in.
- An admin dashboard with users, readings, free and premium counts, conversion, AI errors, revenue and recent activity, protected by role.

**Platform**

- PWA: manifest, icons, a service worker with an offline page, and standalone display.
- SEO: metadata, Open Graph and Twitter images, `robots.txt`, `sitemap.xml`, and JSON-LD.
- Accessibility: semantic landmarks, a skip link, keyboard-operable controls, ARIA radio, tab and meter roles, focus management between steps, form errors, alt text, 44px touch targets, and `prefers-reduced-motion` support.

## How it works

```
Browser                                   Server
───────                                   ──────
choose hand → camera / upload
quality check (canvas) ──── multipart ──▶ POST /api/palm/analyze
                                           ├─ sniff + decode + re-encode (sharp), quality gate
                                           ├─ store privately (local / S3), create Reading
                                           ├─ Stage 1: vision model → PalmAnalysisSchema (Zod)
                                           │    retry with correction note → controlled error
                                           └─ model says "no palm / unusable" → REJECTED, photo deleted
                    ────── JSON ─────────▶ POST /api/palm/interpret
                                           ├─ match palmistry rules (src/lib/palmistry/*)
                                           ├─ Stage 2: text model sees ONLY observations + rules
                                           ├─ grounding filter + safety filter + re-validate
                                           └─ save → COMPLETE
results page ◀── entitlement projection ── GET /readings/[id]
```

See [`docs/AI_PIPELINE.md`](docs/AI_PIPELINE.md) for prompts, schemas, validation, retry and grounding rules.

## Tech stack

| Area       | Choice                                                                                             |
| ---------- | -------------------------------------------------------------------------------------------------- |
| Framework  | Next.js 16 (App Router, Turbopack, `proxy.ts`), React 19, TypeScript (strict)                      |
| Styling    | Tailwind CSS 4, custom design tokens, SVG illustrations (no stock or copyrighted images)           |
| Database   | PostgreSQL + Prisma 6                                                                              |
| Validation | Zod 4 (requests, AI output, environment, stored JSON)                                              |
| Auth       | Built-in session auth (scrypt, hashed session tokens) behind a single seam for Auth.js or Supabase |
| AI         | Provider abstraction: Anthropic (official SDK), OpenAI-compatible, Gemini, mock                    |
| Images     | `sharp` on the server, Canvas in the browser                                                       |
| Storage    | Private object storage abstraction: local filesystem, S3-compatible, memory                        |
| Payments   | Provider abstraction: Stripe, Razorpay, mock                                                       |
| PDF        | `pdf-lib`                                                                                          |
| Quality    | ESLint, Prettier (+ Tailwind plugin), Vitest, Testing Library, GitHub Actions                      |

## Local development

Requirements: **Node.js 20.9+** (22 recommended) and **PostgreSQL 14+**.

```bash
git clone <repo> palm-ai && cd palm-ai
cp .env.example .env          # defaults use the mock AI and no payments
npm install                   # also runs `prisma generate`

# Create the two databases (adjust credentials to your setup)
createdb palmai
createdb palmai_test

npm run db:migrate            # applies prisma/migrations to DATABASE_URL
npm run dev                   # http://localhost:3000
```

The default `.env.example` runs with `AI_PROVIDER=mock`, which returns built-in **sample** features and labels every reading as **Demo mode**. That lets you exercise the whole UI without an API key. Set `PAYMENT_PROVIDER=mock` to try the unlock flow locally without any real payment.

Useful scripts:

| Command                           | What it does                                      |
| --------------------------------- | ------------------------------------------------- |
| `npm run dev`                     | Development server                                |
| `npm run build` / `npm start`     | Production build / server                         |
| `npm run lint`                    | ESLint                                            |
| `npm run format` / `format:check` | Prettier                                          |
| `npm run typecheck`               | `tsc --noEmit`                                    |
| `npm test`                        | Unit, integration and component tests (Vitest)    |
| `npm run check`                   | Lint, typecheck, tests and build in one go        |
| `npm run db:migrate`              | Create and apply a migration (development)        |
| `npm run db:deploy`               | Apply migrations (production / CI)                |
| `npm run admin:grant -- <email>`  | Give an existing account the ADMIN role           |
| `npm run icons`                   | Regenerate PWA icons from `public/icons/icon.svg` |

> Running a **production build** locally (`npm start`) refuses the mock AI and mock payments unless `DEMO_MODE=true`. This is deliberate, so a misconfigured deployment can't silently serve sample readings.

## Environment variables

All variables are documented inline in [`.env.example`](.env.example) and validated at startup by [`src/lib/config/env.ts`](src/lib/config/env.ts). Empty values count as unset, and secrets are only read on the server. Only `NEXT_PUBLIC_*` values reach the browser.

| Variable                                                                                 | Purpose                                                             |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `DATABASE_URL`                                                                           | PostgreSQL connection string                                        |
| `TEST_DATABASE_URL`                                                                      | Separate database for integration tests (**it gets truncated**)     |
| `NEXT_PUBLIC_APP_URL`                                                                    | Canonical URL (metadata, sitemap, payment redirects, CSRF origin)   |
| `NEXT_PUBLIC_APP_NAME`                                                                   | Product name (defaults to PalmAI)                                   |
| `AI_PROVIDER`                                                                            | `anthropic`, `openai`, `gemini` or `mock`                           |
| `AI_API_KEY`, `AI_MODEL`, `AI_INTERPRETATION_MODEL`                                      | Credentials and models                                              |
| `AI_TIMEOUT_MS`, `AI_MAX_ATTEMPTS`, `AI_EFFORT`                                          | Call limits and the Anthropic effort level                          |
| `AI_ANALYSIS_THINKING`, `AI_INTERPRETATION_THINKING`                                     | Gemini thinking level per stage (defaults: model default / `low`)   |
| `PIPELINE_TIMING`                                                                        | `1` logs per-step pipeline timings outside development              |
| `PAYMENT_PROVIDER`                                                                       | `stripe`, `razorpay`, `mock` or `none`                              |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`                                             | Stripe                                                              |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`                      | Razorpay                                                            |
| `ESTIMATED_BASIC_AI_COST_INR`, `ESTIMATED_EXTENDED_AI_COST_INR`                          | Internal AI cost estimates for the admin economics (defaults 4 / 0) |
| `PAYMENT_FEE_PERCENT`, `PAYMENT_FEE_FIXED_INR`, `AD_REVENUE_PER_1000_READINGS_INR`       | Optional; unset = "not configured" (never assumed)                  |
| `AI_COST_INPUT_PER_1M_TOKENS_INR`, `AI_COST_OUTPUT_PER_1M_TOKENS_INR`                    | Optional token prices for per-reading cost in the beta report       |
| `ADS_MODE`                                                                               | `off` or `placeholder` (development ad boxes; no ad network)        |
| `STORAGE_PROVIDER`                                                                       | `local`, `s3` or `memory`                                           |
| `STORAGE_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | S3-compatible private bucket                                        |
| `MAX_UPLOAD_BYTES`, `IMAGE_RETENTION_DAYS`                                               | Upload limit and guest data retention                               |
| `CRON_SECRET`                                                                            | Protects `/api/cron/cleanup`                                        |
| `ADMIN_EMAILS`                                                                           | Comma-separated admin emails (alternative to `admin:grant`)         |
| `ANALYTICS_PROVIDER`                                                                     | `database`, `console` or `none`                                     |
| `DEMO_MODE`                                                                              | Allow the mock providers in a production build (private demos only) |

## Database setup

The schema lives in [`prisma/schema.prisma`](prisma/schema.prisma). Its models are User, Session, Reading, PalmAnalysis, PalmInterpretation, Payment, Entitlement, UsageEvent and ProcessedWebhookEvent, with indexes on the hot paths.

- **Development:** `npm run db:migrate`
- **Production / CI:** `npm run db:deploy` (applies the committed migrations)
- **Inspect data:** `npm run db:studio`

AI output is stored as JSONB, and it is validated with Zod both **before writing and again after reading**.

## AI provider setup

Pick a provider in `.env`:

```bash
# Anthropic Claude (official SDK). Model defaults to claude-opus-5-5.
AI_PROVIDER=anthropic
AI_API_KEY=sk-ant-...
AI_EFFORT=medium              # low | medium | high

# OpenAI-compatible chat completions with image input
AI_PROVIDER=openai
AI_API_KEY=sk-...
AI_MODEL=<a vision-capable model>

# Google Gemini
AI_PROVIDER=gemini
AI_API_KEY=...
AI_MODEL=gemini-3.8-flash   # verified: stable, vision + JSON mode
```

The Anthropic adapter opts into server-side refusal fallbacks (`fallbacks: "default"`), so a request a safety classifier declines is retried on Anthropic's recommended fallback model.

To add another vendor, implement the `AiProvider` interface in `src/lib/ai/types.ts` (one `complete()` method) and register it in `src/lib/ai/index.ts`. Nothing else in the app knows which vendor is in use.

If the provider is missing or misconfigured, the API returns a friendly `AI_NOT_CONFIGURED` error (HTTP 503), and nothing is stored.

## Monetization

The main reading is free. Every price lives in one catalogue,
`src/lib/monetization/price.ts` (`PRODUCTS`, `WALLET_TOPUPS`); every label,
checkout amount and analytics property derives from it. Prices are never
taken from the request.

| Product          | Price                                 | What it gives                                                                               |
| ---------------- | ------------------------------------- | ------------------------------------------------------------------------------------------- |
| Detailed reading | ₹49                                   | Every section in depth, all lines, parvats, fingers, markings and the PDF — for one reading |
| Couple reading   | ₹99                                   | Your right palm and your partner's read side by side (`/compatibility`)                     |
| Family pack      | ₹149                                  | 4 reading credits (one credit unlocks one detailed reading; never expire)                   |
| Gift a reading   | ₹49                                   | A gift code to share on WhatsApp (`/gift/CODE`), worth one credit, valid a year             |
| Membership       | ₹299                                  | Every reading on the account includes the detailed reading for 365 days; no auto-renewal    |
| Wallet top-up    | ₹100 → ₹110, ₹250 → ₹280, ₹500 → ₹575 | Closed-loop balance, spendable only on PalmAI                                               |

- **Astrology (free):** `/horoscope` (daily rashifal for 12 Moon signs, one
  cached AI call per day and language, grounded in the Moon's transit house,
  rule-based fallback), `/kundli` (Lagna chart, nine grahas, nakshatra,
  Vimshottari dasha — computed in the browser with `astronomy-engine`, Lahiri
  ayanamsa, whole-sign houses), `/kundli-milan` (Ashtakoota Guna Milan /36)
  and `/panchang` (tithi, nakshatra, yoga, karana, sunrise/sunset, Rahu Kaal).
  Maths lives in `src/lib/astro/` and is unit-tested against known dates.
- **Full Kundli reading (₹99):** the chart is saved only when the visitor asks
  for it (`KundliProfile`), and written by AI after payment (or with
  membership), grounded in the chart facts and safety-filtered (no doshas,
  remedies or event predictions).
- **Ask a Reader** (`/readers`, `/chat/[id]`): 8 AI reader personas
  (`src/lib/readers/catalog.ts`), each **always labelled as an AI reader**
  with an illustrated (not photographic) portrait. They answer questions about
  the visitor's own reading. Pricing tiers live in `READER_TIERS`
  (₹39 / ₹49 / ₹79 / ₹99 a question; bundles of 3 for ₹99 / ₹129, 8 for ₹150,
  10 for ₹200). The first chat about a completed reading includes one free
  question. A question is reserved atomically and given back if the answer
  fails; answers pass the same safety filter as readings, and the persona
  must say it is an AI if asked.
- **What's free:** the main reading (headline, introduction, the way you
  think, the way you care, strengths, career nature, one insight), the palm
  map and the detected features.
- **The detailed reading is written only after it is unlocked**
  (`POST /api/readings/[id]/detailed`, claim-guarded and idempotent), so a
  free reading costs only the vision call plus the short main reading. The
  results page writes it automatically after purchase; the PDF waits (409)
  until it exists.
- **Credits and wallet** are kept in an append-only `LedgerEntry` table with a
  unique `(unit, reason, refId)`, so replayed webhooks and double clicks can't
  credit twice. Wallet spends create a `WALLET` payment that admin revenue
  excludes (the money was counted when the wallet was topped up).
- **Referrals:** a signed-in visitor's share link is `/?ref=CODE`. A referral
  qualifies when the friend signs up through it and completes a real
  (non-demo) reading; every 3 qualified referrals earn one reading credit, up
  to 5 per 30 days.
- **Couple readings:** the partner's palm is analysed only (role `PARTNER`,
  never used for training, kept out of the reading list) and requires the
  user to confirm the partner agreed. The couple reading is written after the
  ₹99 unlock, grounded in both palms' observed features and filtered for
  safety (no marriage/break-up predictions, kundli/guna matching, scores,
  doshas or remedies).
- **Access is decided on the server** by a `READING_PREMIUM` entitlement that
  only a verified payment for that reading grants. Locked content is removed
  before anything reaches the browser; query strings, client state and request
  parameters can't unlock it, and a payment can only ever unlock the reading
  it was created for.
- **Payment states** shown to the customer: `UNPAID`, `PAYMENT_INITIATED`,
  `PAYMENT_SUCCESS`, `PAYMENT_FAILED`, `PAYMENT_CANCELLED`. Only a verified
  success unlocks.
- **Guests** can buy without an account (the reading is tied to their browser);
  signing up later moves their readings to the account.
- **Funnel analytics:** `reading_started`, `basic_reading_completed`,
  `extended_offer_viewed`, `extended_checkout_started`,
  `extended_payment_success`, `extended_payment_failed` (with `reason`:
  `failed`, `cancelled`, `amount_mismatch` or `checkout_error`) and
  `extended_reading_unlocked`, each with `reading_id`, `price_inr`,
  `currency`, `ai_provider`, `model`, `is_demo` and `guest` — no personal data.
- **Economics:** the admin dashboard shows the funnel, conversion, and revenue,
  estimated AI cost, payment fees, ad revenue and gross contribution in total
  and per 1,000 users. Mock/demo payments are excluded from revenue.
- **Ads:** `<AdSlot placement="free-reading-result" />` marks where ads may go
  on free results (never during upload or analysis). No ad network is
  integrated; in development it renders a labelled placeholder.

## Beta testing

- `docs/BETA_TEST_CHECKLIST.md` — the 20-photo test script, payment checks and
  go/no-go criteria, with a results template in `docs/beta/`.
- `/admin/beta` (admins only) — per-reading selected vs detected hand,
  confidence, stage 1/2 times, retries, filtered items, provider/model, tokens
  and estimated AI cost; CSV export at `/api/admin/beta-report`.

## Payment setup

See `docs/RAZORPAY.md` for the full Razorpay setup and verification flow.

**Stripe**

1. Set `PAYMENT_PROVIDER=stripe` and `STRIPE_SECRET_KEY`.
2. Create a webhook endpoint at `https://<your-domain>/api/payments/webhook/stripe` for the events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed` and `checkout.session.expired`.
3. Put its signing secret in `STRIPE_WEBHOOK_SECRET`.
4. For local testing: `stripe listen --forward-to localhost:3000/api/payments/webhook/stripe`.

**Razorpay**

1. Set `PAYMENT_PROVIDER=razorpay`, `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
2. Add a webhook at `https://<your-domain>/api/payments/webhook/razorpay` for `payment.captured`, `order.paid` and `payment.failed`.
3. Put its secret in `RAZORPAY_WEBHOOK_SECRET`.
4. The checkout script loads from `checkout.razorpay.com`, which the CSP allows automatically when Razorpay is the active provider.

Payments are fulfilled idempotently. The paid amount and currency are checked against the stored payment, duplicate webhook deliveries are ignored, and Stripe success redirects are confirmed on the server so users see their report immediately. To add another provider, implement `PaymentProvider` in `src/lib/payments/types.ts`.

## Deployment

The app is optimised for **Vercel** and works on any Node.js host that runs `next start`.

1. Provision PostgreSQL (Neon, Supabase, RDS…) and an S3-compatible **private** bucket (S3, R2, Supabase Storage). The local filesystem provider isn't suitable for serverless hosts.
2. Set the environment variables (see above): `STORAGE_PROVIDER=s3`, a real `AI_PROVIDER`, `PAYMENT_PROVIDER`, `CRON_SECRET` and `NEXT_PUBLIC_APP_URL`.
3. Build command: `npm run build`. Run `npm run db:deploy` as a release step.
4. `vercel.json` schedules the daily retention job (`/api/cron/cleanup`). Vercel Cron sends the `CRON_SECRET` bearer token automatically; on other hosts, call the endpoint with `Authorization: Bearer $CRON_SECRET`.
5. Grant yourself admin: sign up, then run `npm run admin:grant -- you@example.com` (or set `ADMIN_EMAILS`).

Uploads are compressed in the browser to stay well under Vercel's ~4.5 MB request body limit. `MAX_UPLOAD_BYTES` enforces the cap on the server.

## Security & privacy

- **Images:** stored only in private storage under random server-generated keys. They are never public and never use the uploaded filename. They are served only through an owner-authorised, `no-store` route, re-encoded to strip EXIF and GPS, and deleted when rejected, failed, deleted, or past guest retention. They are never used for training without an explicit opt-in (off by default).
- **Validation:** Zod schemas on every request body, route parameter, environment variable and AI response. Uploads are checked by magic bytes, size and pixel limits.
- **Auth:** scrypt password hashing, random 256-bit session tokens stored as SHA-256 hashes, and httpOnly, SameSite=Lax, Secure (in production) cookies. Login failures return identical messages with uniform timing.
- **Authorization:** every reading access checks ownership and returns 404 for other people's readings, so ids can't be probed. Admin requires a role. There are no hard-coded credentials.
- **CSRF:** `src/proxy.ts` rejects cross-site state-changing API requests (Origin and Sec-Fetch-Site checks) on top of SameSite cookies. Webhooks rely on signatures instead.
- **Headers:**
  - a per-request **nonce-based CSP** with `strict-dynamic`, `frame-ancestors 'none'` and `object-src 'none'`;
  - HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` (camera limited to self) and COOP.
- **Rate limiting:** a `RateLimiter` interface with an in-memory implementation, covering analysis, interpretation, auth, checkout and events. **Use a shared store (e.g. Upstash Redis) on multi-instance deployments** via `setRateLimiter`.
- **Errors:** users only see friendly messages. Stack traces and provider errors are logged on the server only, with sensitive keys redacted.
- **No unsafe rendering:** model output is rendered as text, never HTML. The only `dangerouslySetInnerHTML` is the static JSON-LD on the landing page, with `<` escaped. AI output is never executed.
- **Secrets:** server-only modules (`server-only`), and the client bundle was checked for leaked secret names.

## Testing

```bash
npm test                         # all suites
npx vitest run tests/unit        # pure unit tests (no database needed)
```

Integration tests need `TEST_DATABASE_URL`. **That database is truncated by the tests.** Without it they are skipped with a warning, and CI always provides it.

| Suite                                       | Covers                                                                                                                          |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `tests/unit/palm-analysis-schema.test.ts`   | Analysis schema, including rejecting invented details on non-visible lines                                                      |
| `tests/unit/interpretation.test.ts`         | Rules engine, grounding filter, safety filter, knowledge-base wording                                                           |
| `tests/unit/ai-structured.test.ts`          | JSON extraction and repair, retry with correction, error mapping                                                                |
| `tests/unit/image-quality.test.ts`          | Brightness, blur and resolution heuristics; magic-byte sniffing                                                                 |
| `tests/unit/payment-signatures.test.ts`     | Stripe and Razorpay signature verification, including replay and tampering                                                      |
| `tests/unit/security.test.ts`               | CSRF origin check, proxy and CSP, entitlement projection                                                                        |
| `tests/integration/auth.test.ts`            | Signup, login, logout, sessions, rate limiting, account deletion                                                                |
| `tests/integration/palm-pipeline.test.ts`   | Upload validation; reading creation and retrieval; access control; AI rejection, timeouts and invalid JSON; grounding; deletion |
| `tests/integration/payments.test.ts`        | Entitlements; mock, Stripe and Razorpay checkout; webhook verification and idempotency; PDF gating                              |
| `tests/integration/razorpay.test.ts`        | Razorpay order, signature + API verification, failed/cancelled, webhook replay/duplicates, refresh, Reading A vs B              |
| `tests/integration/beta-report.test.ts`     | Beta report rows (hands, timings, retries, tokens, cost), CSV export and admin-only access                                      |
| `tests/integration/monetization.test.ts`    | Free → ₹49 flow; failed, cancelled and verified payments; cross-reading replay; manipulation; funnel events                     |
| `tests/unit/monetization.test.tsx`          | Central price, economics maths, ad slot, the detailed-reading offer and payment-state notices                                   |
| `tests/integration/growth.test.ts`          | Family pack credits, wallet top-up and spend, gifts, membership, referrals and couple readings                                  |
| `tests/unit/pipeline-performance.test.ts`   | Image preprocessing, timing logs, thinking levels, prompt trimming, duplicate-request protection                                |
| `tests/integration/admin-and-ops.test.ts`   | Admin access, stats, the analytics allow-list, the cleanup job                                                                  |
| `tests/components/reading-journey.test.tsx` | Hand selection, file validation, quality blocking, consent, progress steps, free and premium results                            |

CI (`.github/workflows/ci.yml`) runs install, lint, format check, typecheck, migrations, tests and build against a Postgres service, and fails on any error.

## Project structure

```
src/
  app/                    routes: pages + /api route handlers, metadata (robots, sitemap, manifest, OG)
  components/             UI: landing/, reading-flow/, results/, account/, admin/, palm/, ui/
  lib/
    ai/                   provider abstraction, providers/, JSON extraction, structured-output loop
    palmistry/            knowledge rules: lines, mounts, fingers, handShapes, markings, interpretation
    pipeline/             analyze (stage 1), interpret (stage 2), grounding, safety
    schemas/              Zod: palm-analysis, palm-interpretation, api
    readings/             service, entitlement projection, view models
    payments/             provider abstraction, providers/, signatures, service, pricing
    auth/                 crypto, sessions, actor (user/guest), accounts
    storage/              local / s3 / memory private object storage
    image/                shared quality metrics, browser + server processing
    security/             rate limiting, same-origin check
    analytics/, admin/, report/, maintenance/, config/, http/
  prompts/                versioned prompt files for both stages
  proxy.ts                CSP nonce + CSRF
prisma/                   schema + migrations
tests/                    unit/, integration/, components/, helpers/
docs/                     ARCHITECTURE.md, AI_PIPELINE.md
```

## Roadmap

- Shared rate-limit store (Upstash/Redis) and request queueing for AI calls
- OAuth sign-in via Auth.js or Supabase Auth (the session module is the seam)
- Email verification and password reset
- On-device hand landmark detection (e.g. MediaPipe) to replace the skin-tone heuristic
- Evaluation set for prompt quality and grounding regressions
- Subscriptions (the `PREMIUM_SUBSCRIPTION` entitlement type already exists)
- Localisation, and side-by-side left/right hand comparison
- Playwright end-to-end tests in CI with a seeded database
