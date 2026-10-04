import "@testing-library/jest-dom/vitest";

// Pick up TEST_DATABASE_URL from a local .env when present (CI sets it directly).
try {
  if (!process.env.TEST_DATABASE_URL) process.loadEnvFile(".env");
} catch {
  // No .env file — fine.
}

// Integration tests use a dedicated database so they can freely truncate tables.
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
} else {
  process.env.DATABASE_URL ??= "postgresql://invalid:invalid@localhost:1/none";
}

Object.assign(process.env, {
  NODE_ENV: "test",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  STORAGE_PROVIDER: "memory",
  AI_PROVIDER: process.env.TEST_AI_PROVIDER ?? "mock",
  PAYMENT_PROVIDER: "mock",
  ANALYTICS_PROVIDER: "database",
  STRIPE_WEBHOOK_SECRET: "whsec_test_secret",
  RAZORPAY_KEY_ID: "rzp_test_key",
  RAZORPAY_KEY_SECRET: "rzp_test_secret",
  RAZORPAY_WEBHOOK_SECRET: "rzp_webhook_secret",
  ADMIN_EMAILS: "admin@example.com",
});
