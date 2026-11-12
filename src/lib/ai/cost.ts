import type { AiUsage } from "./types";

/**
 * Rough list prices, US$ per million tokens (input, output — thinking counts as
 * output). Used to keep every free service under FREE_COST_CAP_INR and to log
 * what free visitors actually cost. Check the provider's price page when you
 * change models; unknown models are treated as expensive.
 */
export const PRICES_USD_PER_M: Record<string, { input: number; output: number }> = {
  "gemini-flash-lite-latest": { input: 0.1, output: 0.4 },
  "gemini-2.5-flash-lite": { input: 0.1, output: 0.4 },
  "gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "gemini-flash-latest": { input: 0.3, output: 2.5 },
  "gpt-5-nano": { input: 0.05, output: 0.4 },
  "gpt-5-mini": { input: 0.25, output: 2 },
  "claude-haiku-5-5": { input: 1, output: 5 },
};

/** Conservative rupees per US dollar (card/forex markup included). */
export const INR_PER_USD = 90;

export function priceOf(model: string) {
  const base = model.replace(/\s*\(.*\)$/, "").replace(/^models\//, "");
  return PRICES_USD_PER_M[base] ?? null;
}

/** Cost in rupees of a call with these token counts; null for an unknown model. */
export function costInr(model: string, inputTokens: number, outputTokens: number): number | null {
  const p = priceOf(model);
  if (!p) return null;
  return ((inputTokens * p.input + outputTokens * p.output) / 1_000_000) * INR_PER_USD;
}

export function usageCostInr(model: string, usage: AiUsage | undefined): number | null {
  if (!usage) return null;
  const input = (usage.inputTokens ?? 0) + (usage.imageTokens ?? 0);
  const output = (usage.outputTokens ?? 0) + (usage.thinkingTokens ?? 0);
  return costInr(model, input, output);
}

/** Output-token headroom a free call may spend on thinking (paid calls get far more). */
export const FREE_THINKING_HEADROOM = 1024;
/** A free call is tried at most this many times (a retry costs a second call). */
export const FREE_MAX_ATTEMPTS = 2;
