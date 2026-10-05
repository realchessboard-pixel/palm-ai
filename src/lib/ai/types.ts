/**
 * Provider-agnostic contract for vision-capable language models. Pipelines
 * only depend on this interface, never on a specific vendor SDK.
 */
export type AiTask =
  "palm_analysis" | "palm_interpretation" | "palm_detailed_reading" | "reading_translation";

export interface AiImage {
  data: Buffer;
  mediaType: "image/jpeg";
}

export interface AiRequest {
  task: AiTask;
  system: string;
  prompt: string;
  image?: AiImage;
  model: string;
  maxTokens: number;
  signal: AbortSignal;
  /** Non-prompt context (used by the mock provider). */
  hints?: { hand?: "left" | "right" };
  /**
   * Reasoning effort for models that "think" before answering. Unset uses the
   * provider's default. Providers without a matching control ignore it.
   */
  thinking?: ThinkingLevel;
}

export const THINKING_LEVELS = ["low", "medium", "high"] as const;
export type ThinkingLevel = (typeof THINKING_LEVELS)[number];

/** Token usage reported by the provider (fields are optional: not every provider reports all). */
export interface AiUsage {
  inputTokens?: number;
  imageTokens?: number;
  outputTokens?: number;
  thinkingTokens?: number;
}

export interface AiResponse {
  text: string;
  model: string;
  usage?: AiUsage;
}

export type AiProviderName = "anthropic" | "openai" | "gemini" | "mock";

export interface AiProvider {
  readonly name: AiProviderName;
  /** Mock providers return sample data and must be labelled as demo output. */
  readonly isMock: boolean;
  readonly defaultModel: string;
  complete(request: AiRequest): Promise<AiResponse>;
}

export type AiErrorKind =
  "timeout" | "rate_limited" | "unavailable" | "auth" | "invalid_request" | "refused" | "empty";

/** Normalised provider failure. `retryable` drives the retry loop. */
export class AiError extends Error {
  readonly kind: AiErrorKind;
  readonly retryable: boolean;

  constructor(kind: AiErrorKind, message: string, options: { cause?: unknown } = {}) {
    super(message, { cause: options.cause });
    this.name = "AiError";
    this.kind = kind;
    this.retryable = kind === "rate_limited" || kind === "unavailable" || kind === "empty";
  }
}

/** Map an HTTP status from a provider REST API to an AiError kind. */
export function kindForStatus(status: number): AiErrorKind {
  if (status === 401 || status === 403) return "auth";
  if (status === 408) return "timeout";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "unavailable";
  return "invalid_request";
}
