import type { AiProvider, AiRequest, AiUsage } from "@/lib/ai/types";

type ScriptStep = string | Error | ((request: AiRequest) => string);

/**
 * A scripted provider: returns (or throws) each queued response in order. A
 * step may be a function of the request (e.g. to echo translation ids).
 */
export class ScriptedProvider implements AiProvider {
  readonly name = "anthropic" as const;
  readonly isMock = false;
  readonly defaultModel = "test-model";
  readonly requests: AiRequest[] = [];

  constructor(
    private readonly script: ScriptStep[],
    private readonly usage?: AiUsage,
  ) {}

  async complete(request: AiRequest) {
    this.requests.push(request);
    const next = this.script.shift();
    if (next === undefined) throw new Error("script exhausted");
    if (next instanceof Error) throw next;
    const text = typeof next === "function" ? next(request) : next;
    return { text, model: "test-model", usage: this.usage };
  }
}
