import "server-only";
import type { z } from "zod";
import { AppError } from "./errors";

const MAX_JSON_BYTES = 32 * 1024;

/** Read and validate a small JSON body. Never trusts the client. */
export async function parseJsonBody<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<z.output<S>> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_JSON_BYTES)
    throw new AppError("VALIDATION_ERROR", { message: "Request too large." });

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new AppError("VALIDATION_ERROR", { message: "Expected a JSON request." });
  }

  const text = await request.text();
  if (text.length > MAX_JSON_BYTES)
    throw new AppError("VALIDATION_ERROR", { message: "Request too large." });

  let raw: unknown;
  try {
    raw = text ? JSON.parse(text) : {};
  } catch {
    throw new AppError("VALIDATION_ERROR", { message: "Malformed JSON." });
  }
  return schema.parse(raw);
}

export async function parseParams<S extends z.ZodType>(
  params: Promise<unknown>,
  schema: S,
): Promise<z.output<S>> {
  const parsed = schema.safeParse(await params);
  if (!parsed.success) throw new AppError("NOT_FOUND");
  return parsed.data;
}
