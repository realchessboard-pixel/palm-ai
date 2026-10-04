import "server-only";
import { z } from "zod";
import { THINKING_LEVELS } from "@/lib/ai/types";

/**
 * Server-side environment configuration.
 *
 * Every secret is read here and nowhere else, so it is easy to audit what the
 * server depends on. Nothing in this module is ever imported by client code
 * (`server-only` enforces that at build time).
 */

const optionalString = z
  .string()
  .optional()
  .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined));

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

  // AI
  AI_PROVIDER: z.enum(["anthropic", "openai", "gemini", "mock"]).optional(),
  AI_API_KEY: optionalString,
  AI_MODEL: optionalString,
  AI_INTERPRETATION_MODEL: optionalString,
  AI_TIMEOUT_MS: z.coerce.number().int().min(5_000).max(300_000).default(90_000),
  AI_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(4).default(2),
  AI_EFFORT: z.enum(["low", "medium", "high"]).default("medium"),
  // Per-stage reasoning ("thinking") level for providers that support it (Gemini).
  // Unset analysis thinking keeps the model default, which measured best for
  // the vision step; "low" for the text-only interpretation step roughly
  // halves its latency with no measured loss in grounding or completeness.
  AI_ANALYSIS_THINKING: z.enum(THINKING_LEVELS).optional(),
  AI_INTERPRETATION_THINKING: z.enum(THINKING_LEVELS).default("low"),

  // Payments
  PAYMENT_PROVIDER: z.enum(["stripe", "razorpay", "mock", "none"]).default("none"),
  STRIPE_SECRET_KEY: optionalString,
  STRIPE_WEBHOOK_SECRET: optionalString,
  RAZORPAY_KEY_ID: optionalString,
  RAZORPAY_KEY_SECRET: optionalString,
  RAZORPAY_WEBHOOK_SECRET: optionalString,
  PREMIUM_PRICE_AMOUNT: z.coerce.number().int().positive().default(499),
  PREMIUM_PRICE_CURRENCY: z
    .string()
    .regex(/^[a-zA-Z]{3}$/)
    .default("usd")
    .transform((v) => v.toLowerCase()),

  // Storage
  STORAGE_PROVIDER: z.enum(["local", "s3", "memory"]).default("local"),
  STORAGE_BUCKET: optionalString,
  STORAGE_LOCAL_DIR: z.string().default("./storage"),
  S3_REGION: optionalString,
  S3_ENDPOINT: optionalString,
  S3_ACCESS_KEY_ID: optionalString,
  S3_SECRET_ACCESS_KEY: optionalString,

  // Uploads & retention
  MAX_UPLOAD_BYTES: z.coerce
    .number()
    .int()
    .min(100_000)
    .max(20 * 1024 * 1024)
    .default(4 * 1024 * 1024),
  IMAGE_RETENTION_DAYS: z.coerce.number().int().min(0).max(3650).default(30),

  /**
   * Allows the mock AI and mock payment providers when NODE_ENV=production
   * (e.g. a private demo deployment). Never enable on a real deployment.
   */
  DEMO_MODE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),

  // Operations
  CRON_SECRET: optionalString,
  ADMIN_EMAILS: optionalString,
  ANALYTICS_PROVIDER: z.enum(["database", "console", "none"]).default("database"),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

export function getEnv(): Env {
  if (cached) return cached;
  // Treat empty values (e.g. `AI_PROVIDER=` copied from .env.example) as unset.
  const raw = Object.fromEntries(
    Object.entries(process.env).filter(([, value]) => value !== undefined && value.trim() !== ""),
  );
  const parsed = EnvSchema.safeParse(raw);
  if (!parsed.success) {
    // Only report key names, never values: values may be secrets.
    const keys = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid environment configuration. Check: ${keys}`);
  }
  cached = parsed.data;
  return cached;
}

/** Test helper: forget the cached env so tests can change process.env. */
export function resetEnvCache(): void {
  cached = undefined;
}

export function isProduction(): boolean {
  return getEnv().NODE_ENV === "production";
}

export function adminEmails(): string[] {
  return (getEnv().ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
