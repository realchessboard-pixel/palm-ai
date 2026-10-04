import "server-only";
import { getEnv } from "@/lib/config/env";
import { AppError } from "@/lib/http/errors";
import { AnthropicProvider } from "./providers/anthropic";
import { GeminiProvider } from "./providers/gemini";
import { MockProvider } from "./providers/mock";
import { OpenAiProvider } from "./providers/openai";
import type { AiProvider } from "./types";

export type { AiProvider } from "./types";

let override: AiProvider | undefined;

/** Test helper: force a specific provider. */
export function setAiProvider(provider: AiProvider | undefined): void {
  override = provider;
}

/**
 * Build the configured provider. Credentials come only from server env vars;
 * misconfiguration surfaces as AI_NOT_CONFIGURED rather than a fake success.
 */
export function getAiProvider(): AiProvider {
  if (override) return override;
  const env = getEnv();

  switch (env.AI_PROVIDER) {
    case "mock":
      if (env.NODE_ENV === "production" && !env.DEMO_MODE) {
        throw new AppError("AI_NOT_CONFIGURED", {
          internal: "Mock AI provider is disabled in production",
        });
      }
      return new MockProvider(env.NODE_ENV === "test" ? 0 : 1500);
    case "anthropic":
      if (!env.AI_API_KEY)
        throw new AppError("AI_NOT_CONFIGURED", { internal: "AI_API_KEY missing" });
      return new AnthropicProvider({
        apiKey: env.AI_API_KEY,
        timeoutMs: env.AI_TIMEOUT_MS,
        effort: env.AI_EFFORT,
      });
    case "openai":
    case "gemini": {
      if (!env.AI_API_KEY || !env.AI_MODEL) {
        throw new AppError("AI_NOT_CONFIGURED", {
          internal: "AI_API_KEY and AI_MODEL are required",
        });
      }
      return env.AI_PROVIDER === "openai"
        ? new OpenAiProvider({ apiKey: env.AI_API_KEY, model: env.AI_MODEL })
        : new GeminiProvider({ apiKey: env.AI_API_KEY, model: env.AI_MODEL });
    }
    default:
      throw new AppError("AI_NOT_CONFIGURED", { internal: "AI_PROVIDER is not set" });
  }
}

export function analysisModel(provider: AiProvider): string {
  return getEnv().AI_MODEL ?? provider.defaultModel;
}

export function interpretationModel(provider: AiProvider): string {
  const env = getEnv();
  return env.AI_INTERPRETATION_MODEL ?? env.AI_MODEL ?? provider.defaultModel;
}
