import "server-only";
import { AiError, type AiProvider, type AiRequest, type AiResponse } from "../types";
import { postJson } from "./http";

interface ChatCompletion {
  model?: string;
  choices?: {
    message?: { content?: string | null; refusal?: string | null };
    finish_reason?: string;
  }[];
}

/** OpenAI-compatible Chat Completions with image input and JSON mode. */
export class OpenAiProvider implements AiProvider {
  readonly name = "openai" as const;
  readonly isMock = false;
  readonly defaultModel: string;

  constructor(private readonly options: { apiKey: string; model: string; baseUrl?: string }) {
    this.defaultModel = options.model;
  }

  async complete(request: AiRequest): Promise<AiResponse> {
    const userContent: unknown[] = [{ type: "text", text: request.prompt }];
    if (request.image) {
      userContent.push({
        type: "image_url",
        image_url: {
          url: `data:${request.image.mediaType};base64,${request.image.data.toString("base64")}`,
          detail: "high",
        },
      });
    }
    const json = (await postJson(
      `${this.options.baseUrl ?? "https://api.openai.com/v1"}/chat/completions`,
      {
        model: request.model,
        max_completion_tokens: request.maxTokens,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: request.system },
          { role: "user", content: userContent },
        ],
      },
      { Authorization: `Bearer ${this.options.apiKey}` },
      request.signal,
      "OpenAI",
    )) as ChatCompletion;

    const choice = json.choices?.[0];
    if (choice?.message?.refusal) throw new AiError("refused", "OpenAI model refused");
    if (choice?.finish_reason === "length") throw new AiError("empty", "OpenAI output truncated");
    const text = choice?.message?.content?.trim();
    if (!text) throw new AiError("empty", "OpenAI returned no content");
    return { text, model: json.model ?? request.model };
  }
}
