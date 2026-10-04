import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { AiError, type AiProvider, type AiRequest, type AiResponse } from "../types";

export const ANTHROPIC_DEFAULT_MODEL = "claude-opus-5-5";

/**
 * Claude via the official Anthropic SDK. Opts into server-side refusal
 * fallbacks (`fallbacks: "default"`), so a request declined by a safety
 * classifier is retried on Anthropic's recommended fallback model.
 */
export class AnthropicProvider implements AiProvider {
  readonly name = "anthropic" as const;
  readonly isMock = false;
  readonly defaultModel = ANTHROPIC_DEFAULT_MODEL;
  private readonly client: Anthropic;
  private readonly effort: "low" | "medium" | "high";

  constructor(options: { apiKey: string; timeoutMs: number; effort: "low" | "medium" | "high" }) {
    // Retries are handled by our own structured-output loop.
    this.client = new Anthropic({
      apiKey: options.apiKey,
      timeout: options.timeoutMs,
      maxRetries: 0,
    });
    this.effort = options.effort;
  }

  async complete(request: AiRequest): Promise<AiResponse> {
    const content: Anthropic.Beta.BetaContentBlockParam[] = [];
    if (request.image) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: request.image.mediaType,
          data: request.image.data.toString("base64"),
        },
      });
    }
    content.push({ type: "text", text: request.prompt });

    let message: Anthropic.Beta.BetaMessage;
    try {
      message = await this.client.beta.messages.create(
        {
          model: request.model,
          max_tokens: request.maxTokens,
          system: request.system,
          messages: [{ role: "user", content }],
          output_config: { effort: this.effort },
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
        },
        { signal: request.signal },
      );
    } catch (error) {
      throw mapAnthropicError(error);
    }

    if (message.stop_reason === "refusal") {
      throw new AiError(
        "refused",
        `Model declined the request (${message.stop_details?.category ?? "unknown"})`,
      );
    }
    const text = message.content
      .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();
    if (!text) throw new AiError("empty", "Model returned no text");
    if (message.stop_reason === "max_tokens") {
      throw new AiError("empty", "Model output was truncated (max_tokens)");
    }
    return { text, model: message.model };
  }
}

function mapAnthropicError(error: unknown): AiError {
  if (
    error instanceof Anthropic.APIUserAbortError ||
    error instanceof Anthropic.APIConnectionTimeoutError
  ) {
    return new AiError("timeout", "Anthropic request timed out", { cause: error });
  }
  if (
    error instanceof Anthropic.AuthenticationError ||
    error instanceof Anthropic.PermissionDeniedError
  ) {
    return new AiError("auth", "Anthropic rejected the API key", { cause: error });
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new AiError("rate_limited", "Anthropic rate limit", { cause: error });
  }
  if (error instanceof Anthropic.BadRequestError || error instanceof Anthropic.NotFoundError) {
    return new AiError("invalid_request", "Anthropic rejected the request", { cause: error });
  }
  if (
    error instanceof Anthropic.APIConnectionError ||
    error instanceof Anthropic.InternalServerError
  ) {
    return new AiError("unavailable", "Anthropic unavailable", { cause: error });
  }
  if (error instanceof Anthropic.APIError) {
    return new AiError(
      (error.status ?? 500) >= 500 ? "unavailable" : "invalid_request",
      "Anthropic API error",
      {
        cause: error,
      },
    );
  }
  return new AiError("unavailable", "Unexpected Anthropic client error", { cause: error });
}
