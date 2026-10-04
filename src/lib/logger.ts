/**
 * Minimal structured server logger. Technical details (stack traces, provider
 * errors) go here and never to the client. Swap the sink for Sentry/Datadog etc.
 */
type Level = "debug" | "info" | "warn" | "error";

const REDACT_KEYS = /(password|secret|token|authorization|api[-_]?key|cookie|signature)/i;

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[depth]";
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => sanitize(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) {
      out[key] = REDACT_KEYS.test(key) ? "[redacted]" : sanitize(v, depth + 1);
    }
    return out;
  }
  if (typeof value === "string" && value.length > 2000) return `${value.slice(0, 2000)}…`;
  return value;
}

function write(level: Level, message: string, context?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "test" && level !== "error" && !process.env.DEBUG_LOGS) return;
  const entry = {
    level,
    message,
    time: new Date().toISOString(),
    ...(context ? (sanitize(context) as Record<string, unknown>) : {}),
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => write("debug", message, context),
  info: (message: string, context?: Record<string, unknown>) => write("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => write("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => write("error", message, context),
};
