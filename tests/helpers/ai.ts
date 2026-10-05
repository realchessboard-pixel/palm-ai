import type { AiProvider, AiRequest, AiUsage } from "@/lib/ai/types";

/** A scripted provider: returns (or throws) each queued response in order. */
export class ScriptedProvider implements AiProvider {
  readonly name = "anthropic" as const;
  readonly isMock = false;
  readonly defaultModel = "test-model";
  readonly requests: AiRequest[] = [];

  constructor(
    private readonly script: (string | Error)[],
    private readonly usage?: AiUsage,
  ) {}

  async complete(request: AiRequest) {
    this.requests.push(request);
    const next = this.script.shift();
    if (next === undefined) throw new Error("script exhausted");
    if (next instanceof Error) throw next;
    return { text: next, model: "test-model", usage: this.usage };
  }
}
