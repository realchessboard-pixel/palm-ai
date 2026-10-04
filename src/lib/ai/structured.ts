import "server-only";
import type { z } from "zod";
import { AppError } from "@/lib/http/errors";
import { logger } from "@/lib/logger";
import { JsonExtractionError, extractJson } from "./json";
import {
  AiError,
  type AiImage,
  type AiProvider,
  type AiTask,
  type AiUsage,
  type ThinkingLevel,
} from "./types";

export interface StructuredRequest<S extends z.ZodType> {
  provider: AiProvider;
  task: AiTask;
  model: string;
  system: string;
  prompt: string;
  image?: AiImage;
  schema: S;
  maxTokens: number;
  timeoutMs: number;
  maxAttempts: number;
  hints?: { hand?: "left" | "right" };
  thinking?: ThinkingLevel;
  /** Extra semantic checks after schema validation; return problems to trigger a retry. */
  check?: (value: z.output<S>) => string[];
}

export interface StructuredResult<T> {
  data: T;
  model: string;
  attempts: number;
  repaired: boolean;
  /** Summed over all attempts. */
  usage: AiUsage;
  /** Wall time spent waiting on the provider, summed over attempts. */
  providerMs: number;
  /** Time spent extracting + validating output, summed over attempts. */
  validateMs: number;
}

function addUsage(total: AiUsage, add: AiUsage | undefined): void {
  if (!add) return;
  for (const key of ["inputTokens", "imageTokens", "outputTokens", "thinkingTokens"] as const) {
    if (add[key] !== undefined) total[key] = (total[key] ?? 0) + add[key]!;
  }
}

function correctionNote(problems: string[]): string {
  return [
    "",
    "IMPORTANT: Your previous response could not be accepted because:",
    ...problems.slice(0, 8).map((p) => `- ${p}`),
    "Respond again with ONLY one valid JSON object that exactly matches the schema. No prose, no code fences.",
  ].join("\n");
}

function describeZodIssues(error: z.ZodError): string[] {
  return error.issues
    .slice(0, 8)
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`);
}

/**
 * Call a model and only return output that parses AND validates. Invalid
 * output is retried with a strict correction note; if it's still invalid the
 * caller gets a controlled AI_INVALID_RESPONSE error.
 */
export async function generateStructured<S extends z.ZodType>(
  request: StructuredRequest<S>,
): Promise<StructuredResult<z.output<S>>> {
  let problems: string[] = [];
  let lastError: unknown;
  const usage: AiUsage = {};
  let providerMs = 0;
  let validateMs = 0;

  for (let attempt = 1; attempt <= request.maxAttempts; attempt++) {
    const prompt = problems.length ? request.prompt + correctionNote(problems) : request.prompt;
    let text: string;
    let model: string;
    const callStarted = performance.now();
    try {
      const response = await request.provider.complete({
        task: request.task,
        system: request.system,
        prompt,
        image: request.image,
        model: request.model,
        maxTokens: request.maxTokens,
        signal: AbortSignal.timeout(request.timeoutMs),
        hints: request.hints,
        thinking: request.thinking,
      });
      text = response.text;
      model = response.model;
      addUsage(usage, response.usage);
      providerMs += performance.now() - callStarted;
    } catch (error) {
      providerMs += performance.now() - callStarted;
      lastError = error;
      if (error instanceof AiError) {
        logger.warn("ai_call_failed", {
          task: request.task,
          attempt,
          kind: error.kind,
          message: error.message,
        });
        if (error.kind === "timeout") throw new AppError("AI_TIMEOUT", { internal: error });
        if (error.kind === "auth") throw new AppError("AI_NOT_CONFIGURED", { internal: error });
        if (error.retryable && attempt < request.maxAttempts) {
          problems = [];
          await new Promise((r) => setTimeout(r, 500 * attempt));
          continue;
        }
        throw new AppError("AI_UNAVAILABLE", { internal: error });
      }
      throw new AppError("AI_UNAVAILABLE", { internal: error });
    }

    const validateStarted = performance.now();
    let extracted;
    try {
      extracted = extractJson(text);
    } catch (error) {
      lastError = error;
      problems = [
        error instanceof JsonExtractionError ? error.message : "Response was not valid JSON",
      ];
      logger.warn("ai_invalid_json", { task: request.task, attempt, problem: problems[0] });
      validateMs += performance.now() - validateStarted;
      continue;
    }

    const parsed = request.schema.safeParse(extracted.value);
    if (!parsed.success) {
      lastError = parsed.error;
      problems = describeZodIssues(parsed.error);
      logger.warn("ai_schema_mismatch", { task: request.task, attempt, problems });
      validateMs += performance.now() - validateStarted;
      continue;
    }

    const extra = request.check?.(parsed.data) ?? [];
    if (extra.length) {
      lastError = extra;
      problems = extra;
      logger.warn("ai_semantic_check_failed", { task: request.task, attempt, problems: extra });
      validateMs += performance.now() - validateStarted;
      continue;
    }

    validateMs += performance.now() - validateStarted;
    return {
      data: parsed.data,
      model,
      attempts: attempt,
      repaired: extracted.repaired,
      usage,
      providerMs,
      validateMs,
    };
  }

  throw new AppError("AI_INVALID_RESPONSE", { internal: lastError });
}
