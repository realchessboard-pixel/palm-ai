import { logger } from "@/lib/logger";
import type { AiUsage } from "@/lib/ai/types";

/**
 * Development-only pipeline timing. Records named step durations and logs one
 * structured line when the pipeline finishes. Never records image data, prompt
 * text or credentials — only durations, sizes and token counts.
 *
 * Enabled when NODE_ENV=development, or explicitly with PIPELINE_TIMING=1.
 */
export function timingEnabled(): boolean {
  return process.env.NODE_ENV === "development" || process.env.PIPELINE_TIMING === "1";
}

export class PipelineTimer {
  private readonly started = performance.now();
  private readonly steps: Record<string, number> = {};
  private readonly info: Record<string, unknown> = {};

  constructor(private readonly pipeline: string) {}

  /** Time an async step. Durations accumulate if the same label is used twice. */
  async step<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const t = performance.now();
    try {
      return await fn();
    } finally {
      this.add(label, performance.now() - t);
    }
  }

  add(label: string, ms: number): void {
    this.steps[label] = Math.round((this.steps[label] ?? 0) + ms);
  }

  /** Milliseconds since the pipeline started. */
  elapsedMs(): number {
    return Math.round(performance.now() - this.started);
  }

  note(values: Record<string, unknown>): void {
    Object.assign(this.info, values);
  }

  finish(outcome: string): void {
    if (!timingEnabled()) return;
    logger.info("pipeline_timing", {
      pipeline: this.pipeline,
      outcome,
      totalMs: Math.round(performance.now() - this.started),
      steps: this.steps,
      ...this.info,
    });
  }
}

/**
 * Token counts keyed so the logger's secret redaction (which matches "token")
 * leaves them readable.
 */
/**
 * Stored once per completed AI stage (UsageEvent "ai_stage_completed") so the
 * internal beta report can show per-reading timings, retries and token use.
 * Durations, counts and model names only.
 */
export function stageMetrics(input: {
  stage: "analysis" | "interpretation";
  totalMs: number;
  providerMs: number;
  attempts: number;
  provider: string;
  model: string;
  usage: AiUsage | undefined;
}): Record<string, string | number> {
  const usage = usageCounts(input.usage);
  return {
    stage: input.stage,
    total_ms: input.totalMs,
    model_ms: Math.round(input.providerMs),
    attempts: input.attempts,
    provider: input.provider,
    model: input.model,
    ...Object.fromEntries(
      Object.entries(usage).flatMap(([k, v]) => (v === undefined ? [] : [[`${k}_tok`, v]])),
    ),
  };
}

export function usageCounts(usage: AiUsage | undefined) {
  return {
    input: usage?.inputTokens,
    image: usage?.imageTokens,
    output: usage?.outputTokens,
    thinking: usage?.thinkingTokens,
  };
}
