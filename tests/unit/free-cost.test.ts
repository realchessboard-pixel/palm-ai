import { describe, expect, it } from "vitest";
import {
  FREE_MAX_ATTEMPTS,
  FREE_THINKING_HEADROOM,
  costInr,
  priceOf,
  usageCostInr,
} from "@/lib/ai/cost";

/**
 * Worst case for one free use: every call fails once and is retried, and every
 * call spends its whole output allowance plus the thinking headroom. Input
 * sizes are generous upper bounds for our prompts (a palm photo is ~1,300 tokens).
 */
const CALLS = {
  palm: [
    { input: 6000, maxOutput: 6000 }, // vision analysis
    { input: 5000, maxOutput: 1800 }, // free interpretation
    { input: 2500, maxOutput: 5000 }, // translation, chunk 1
    { input: 2500, maxOutput: 5000 }, // translation, chunk 2
  ],
  mahakundliAnswer: [{ input: 4000, maxOutput: 900 }],
  readerQuestion: [{ input: 6000, maxOutput: 1500 }],
};

function worstCaseInr(model: string, calls: { input: number; maxOutput: number }[]) {
  return calls.reduce(
    (sum, c) =>
      sum + FREE_MAX_ATTEMPTS * costInr(model, c.input, c.maxOutput + FREE_THINKING_HEADROOM)!,
    0,
  );
}

describe("free services stay under ₹2 each", () => {
  for (const [service, calls] of Object.entries(CALLS)) {
    it(`${service} costs at most ₹2 on the default free model`, () => {
      expect(worstCaseInr("gemini-flash-lite-latest", calls)).toBeLessThanOrEqual(2);
    });
  }

  it("a typical palm reading costs well under a rupee", () => {
    const typical = usageCostInr("gemini-flash-lite-latest", {
      inputTokens: 4000,
      imageTokens: 1300,
      outputTokens: 4500,
    });
    expect(typical).toBeLessThan(0.5);
  });

  it("does not know unpriced models (treat as unsafe for free use)", () => {
    expect(priceOf("some-new-model")).toBeNull();
    expect(priceOf("gemini-flash-lite-latest (v3)")).not.toBeNull();
  });
});
