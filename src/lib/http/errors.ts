import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { logger } from "@/lib/logger";

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "CSRF_REJECTED"
  | "IMAGE_INVALID"
  | "IMAGE_TOO_LARGE"
  | "IMAGE_QUALITY"
  | "AI_NOT_CONFIGURED"
  | "AI_TIMEOUT"
  | "AI_UNAVAILABLE"
  | "AI_INVALID_RESPONSE"
  | "DATABASE_ERROR"
  | "PAYMENT_NOT_CONFIGURED"
  | "PAYMENT_ERROR"
  | "INTERNAL_ERROR";

const STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  CSRF_REJECTED: 403,
  IMAGE_INVALID: 400,
  IMAGE_TOO_LARGE: 413,
  IMAGE_QUALITY: 422,
  AI_NOT_CONFIGURED: 503,
  AI_TIMEOUT: 504,
  AI_UNAVAILABLE: 502,
  AI_INVALID_RESPONSE: 502,
  DATABASE_ERROR: 503,
  PAYMENT_NOT_CONFIGURED: 503,
  PAYMENT_ERROR: 402,
  INTERNAL_ERROR: 500,
};

const DEFAULT_MESSAGES: Record<ErrorCode, string> = {
  VALIDATION_ERROR: "Some of the information sent was invalid. Please check and try again.",
  UNAUTHORIZED: "Please sign in to continue.",
  FORBIDDEN: "You don't have access to this.",
  NOT_FOUND: "We couldn't find what you were looking for.",
  CONFLICT: "That action conflicts with existing data.",
  RATE_LIMITED: "You're going a little fast. Please wait a moment and try again.",
  CSRF_REJECTED: "This request was blocked for your security. Please refresh and try again.",
  IMAGE_INVALID: "We couldn't read that image. Please upload a JPG, PNG or WebP photo.",
  IMAGE_TOO_LARGE: "That image is too large. Please choose a smaller photo.",
  IMAGE_QUALITY: "This photo isn't clear enough to read. Please try another one.",
  AI_NOT_CONFIGURED: "Palm analysis isn't available right now. Please try again later.",
  AI_TIMEOUT: "The analysis took too long. Please try again.",
  AI_UNAVAILABLE: "We couldn't analyze this palm right now. Please try again.",
  AI_INVALID_RESPONSE: "We couldn't analyze this palm right now. Please try again.",
  DATABASE_ERROR: "We're having trouble saving your data. Please try again shortly.",
  PAYMENT_NOT_CONFIGURED: "Payments aren't available right now.",
  PAYMENT_ERROR:
    "The payment couldn't be completed. You have not been charged twice — please try again.",
  INTERNAL_ERROR: "Something went wrong on our side. Please try again.",
};

/** An error whose message is safe to show to users. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly userMessage: string;
  /** Safe, user-facing extra data (e.g. which quality issues were found). */
  readonly details?: Record<string, unknown>;
  /** Internal-only context for logs. Never returned to clients. */
  readonly internal?: unknown;

  constructor(
    code: ErrorCode,
    options: { message?: string; details?: Record<string, unknown>; internal?: unknown } = {},
  ) {
    super(options.message ?? DEFAULT_MESSAGES[code]);
    this.name = "AppError";
    this.code = code;
    this.status = STATUS[code];
    this.userMessage = options.message ?? DEFAULT_MESSAGES[code];
    this.details = options.details;
    this.internal = options.internal;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export interface ApiErrorBody {
  error: { code: ErrorCode; message: string; details?: Record<string, unknown> };
}

function isPrismaError(error: unknown): boolean {
  const name = (error as { name?: string } | null)?.name ?? "";
  return name.startsWith("PrismaClient");
}

/** Convert any thrown value into a safe JSON response, logging technical detail server-side. */
export function errorResponse(error: unknown, context: Record<string, unknown> = {}) {
  let appError: AppError;
  if (isAppError(error)) {
    appError = error;
  } else if (error instanceof ZodError) {
    appError = new AppError("VALIDATION_ERROR", {
      details: {
        fields: error.issues
          .slice(0, 10)
          .map((i) => ({ path: i.path.join("."), message: i.message })),
      },
    });
  } else if (isPrismaError(error)) {
    appError = new AppError("DATABASE_ERROR", { internal: error });
  } else {
    appError = new AppError("INTERNAL_ERROR", { internal: error });
  }

  const logContext = { ...context, code: appError.code, internal: appError.internal ?? error };
  if (appError.status >= 500) logger.error("request_failed", logContext);
  else logger.warn("request_rejected", { ...context, code: appError.code });

  const body: ApiErrorBody = {
    error: {
      code: appError.code,
      message: appError.userMessage,
      ...(appError.details ? { details: appError.details } : {}),
    },
  };
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (appError.code === "RATE_LIMITED" && typeof appError.details?.retryAfter === "number") {
    headers["Retry-After"] = String(appError.details.retryAfter);
  }
  return NextResponse.json(body, { status: appError.status, headers });
}

type RouteHandler<C> = (request: NextRequest, context: C) => Promise<Response>;

/** Wrap a route handler so every failure becomes a friendly, logged JSON error. */
export function withErrorHandling<C>(name: string, handler: RouteHandler<C>): RouteHandler<C> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return errorResponse(error, { route: name, method: request.method });
    }
  };
}
