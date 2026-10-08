# Razorpay setup (AstroVidya products)

AstroVidya uses Razorpay **Orders + Standard Checkout** with server-side verification.
No Razorpay credential is in the source code: everything comes from environment
variables, and only the public **key id** is ever sent to the browser.

## How a payment unlocks a reading

1. **Order** — `POST /api/payments/checkout` creates a `Payment` (PENDING,
   3500 paise INR, tied to one reading) and a Razorpay order for the same
   amount. The order id is stored as the payment's `providerRef`.
2. **Checkout** — the browser opens Razorpay Checkout for that order.
3. **Callback** — on success, the browser posts `order_id`, `payment_id` and
   `signature` to `POST /api/payments/razorpay/verify`. The server:
   - checks the visitor owns the reading,
   - verifies `HMAC_SHA256(order_id|payment_id, RAZORPAY_KEY_SECRET)`,
   - **fetches the payment from Razorpay's API** and requires that it belongs
     to this order, is `captured`, and matches the stored amount and currency.
     Only then is the `READING_PREMIUM` entitlement granted. An `authorized`
     (not yet captured) payment stays pending until the webhook arrives.
4. **Webhook** — `POST /api/payments/webhook/razorpay` verifies
   `X-Razorpay-Signature` (HMAC of the raw body with
   `RAZORPAY_WEBHOOK_SECRET`). `payment.captured` / `order.paid` fulfil (with
   an amount/currency check); `payment.failed` marks the payment failed.
   Deliveries are de-duplicated by `X-Razorpay-Event-Id`, and fulfilment is
   idempotent, so replays never grant twice. The webhook also unlocks the
   reading if the customer closed the browser before the callback.
5. **Cancel** — closing the Checkout window calls `POST /api/payments/cancel`;
   the payment becomes CANCELLED and the reading stays locked. (If Razorpay
   later reports that order as paid, it still unlocks — money moved.)

A payment can only unlock the reading it was created for: the reading comes
from the server's payment record, never from the request.

## What to configure in Razorpay

1. **Account** — sign up at dashboard.razorpay.com. Test mode works
   immediately; **live mode needs KYC/activation**, which asks for a public
   website with Terms, Privacy, **Refund/Cancellation policy** and **Contact**
   details.
2. **API keys (test first)** — Dashboard → Account & Settings → API Keys →
   Generate Test Key. Put them in the server environment:
   ```bash
   PAYMENT_PROVIDER=razorpay
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
   RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx      # secret — never in code or the browser
   ```
3. **Webhook** — Dashboard → Account & Settings → Webhooks → Add New Webhook:
   - URL: `https://<your-domain>/api/payments/webhook/razorpay` (must be public
     HTTPS; for local testing use a tunnel such as cloudflared/ngrok)
   - Secret: a long random string → `RAZORPAY_WEBHOOK_SECRET`
   - Active events: **`payment.captured`**, **`payment.failed`**, **`order.paid`**
4. **Payment capture** — set **automatic capture** (Account & Settings →
   Payment Capture). Without it, payments stay `authorized` and readings stay
   locked until captured.
5. **Payment methods** — enable UPI and cards (and others you want) for INR.
6. **`NEXT_PUBLIC_APP_URL`** — the exact public origin of the deployment.
7. **Go live** — repeat steps 2–3 in **Live mode** (keys start `rzp_live_`;
   the live webhook has its own secret). Use a fresh production database or
   clear test payments so test money is never counted as revenue. While the key
   id starts with `rzp_test_`, payments are flagged `is_demo` in analytics and
   the admin dashboard labels revenue as test mode.

The CSP automatically allows `checkout.razorpay.com` and `api.razorpay.com`
when `PAYMENT_PROVIDER=razorpay`.

## Testing

- Automated: `tests/integration/razorpay.test.ts` (order creation, signature +
  API verification, failed, cancelled, webhook replay and duplicates, refresh
  after payment, Reading A vs B) and `tests/integration/payments.test.ts`.
- Manual: run the payment checks R1–R7 in `docs/BETA_TEST_CHECKLIST.md` in
  test mode, using Razorpay's documented test cards / UPI IDs. To replay a
  webhook, use "Resend" on the event in the Razorpay dashboard.
