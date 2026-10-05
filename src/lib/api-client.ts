"use client";

/** Small fetch wrapper that turns API error bodies into friendly exceptions. */
export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(message: string, code: string, status: number, details?: Record<string, unknown>) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const NETWORK_MESSAGE = "We couldn't reach the server. Please check your connection and try again.";

export async function apiFetch<T>(input: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(input, { credentials: "same-origin", ...init });
  } catch {
    throw new ApiClientError(NETWORK_MESSAGE, "NETWORK_ERROR", 0);
  }

  let body: unknown = null;
  const text = await response.text().catch(() => "");
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }

  if (!response.ok) {
    const error = (
      body as { error?: { code?: string; message?: string; details?: Record<string, unknown> } }
    )?.error;
    throw new ApiClientError(
      error?.message ?? "Something went wrong. Please try again.",
      error?.code ?? "UNKNOWN",
      response.status,
      error?.details,
    );
  }
  return body as T;
}

/**
 * Failures worth retrying automatically: lost connections, server errors and
 * AI hiccups. Not user errors (bad photo, validation) or security refusals.
 */
export function isTransientError(error: unknown): boolean {
  if (!(error instanceof ApiClientError)) return true;
  if (["AI_TIMEOUT", "AI_UNAVAILABLE", "AI_INVALID_RESPONSE", "NETWORK_ERROR"].includes(error.code))
    return true;
  return error.status === 0 || error.status >= 500;
}

export function postJson<T>(url: string, data: unknown): Promise<T> {
  return apiFetch<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
