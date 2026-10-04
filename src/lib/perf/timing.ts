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
export function usageCounts(usage: AiUsage | undefined) {
  return {
    input: usage?.inputTokens,
    image: usage?.imageTokens,
    output: usage?.outputTokens,
    thinking: usage?.thinkingTokens,
  };
}
