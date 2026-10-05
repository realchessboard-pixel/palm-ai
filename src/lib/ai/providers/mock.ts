import { sampleAnalysis } from "@/lib/palmistry/sample-analysis";
import { AiError, type AiProvider, type AiRequest, type AiResponse } from "../types";

/**
 * Demo provider for local development and tests. It does NOT look at the
 * image: it returns built-in sample features, and readings it produces are
 * flagged `isDemo` and labelled as sample data in the UI.
 */
export class MockProvider implements AiProvider {
  readonly name = "mock" as const;
  readonly isMock = true;
  readonly defaultModel = "mock-sample-v1";

  constructor(private readonly latencyMs = 0) {}

  async complete(request: AiRequest): Promise<AiResponse> {
    if (this.latencyMs > 0) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, this.latencyMs);
        request.signal.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new AiError("timeout", "Mock request aborted"));
        });
      });
    }
    if (request.task !== "palm_analysis") {
      // Interpretation in demo mode uses the deterministic rule engine directly.
      throw new AiError("invalid_request", "Mock provider only serves palm analysis");
    }
    const hand = request.hints?.hand ?? "right";
    return { text: JSON.stringify(sampleAnalysis(hand)), model: this.defaultModel };
  }
}
