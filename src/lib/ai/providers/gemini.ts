import "server-only";
import { AiError, type AiProvider, type AiRequest, type AiResponse } from "../types";
import { postJson } from "./http";

interface GenerateContentResponse {
  modelVersion?: string;
  promptFeedback?: { blockReason?: string };
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
}

/** Google Gemini via the Generative Language REST API, JSON response mode. */
export class GeminiProvider implements AiProvider {
  readonly name = "gemini" as const;
  readonly isMock = false;
  readonly defaultModel: string;

  constructor(private readonly options: { apiKey: string; model: string }) {
    this.defaultModel = options.model;
  }

  async complete(request: AiRequest): Promise<AiResponse> {
    const parts: unknown[] = [];
    if (request.image) {
      parts.push({
        inline_data: {
          mime_type: request.image.mediaType,
          data: request.image.data.toString("base64"),
        },
      });
    }
    parts.push({ text: request.prompt });

    const json = (await postJson(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(request.model)}:generateContent`,
      {
        systemInstruction: { parts: [{ text: request.system }] },
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: request.maxTokens,
        },
      },
      { "x-goog-api-key": this.options.apiKey },
      request.signal,
      "Gemini",
    )) as GenerateContentResponse;

    if (json.promptFeedback?.blockReason)
      throw new AiError("refused", `Gemini blocked: ${json.promptFeedback.blockReason}`);
    const candidate = json.candidates?.[0];
    if (candidate?.finishReason === "SAFETY") throw new AiError("refused", "Gemini safety stop");
    if (candidate?.finishReason === "MAX_TOKENS")
      throw new AiError("empty", "Gemini output truncated");
    const text = candidate?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("")
      .trim();
    if (!text) throw new AiError("empty", "Gemini returned no content");
    return { text, model: json.modelVersion ?? request.model };
  }
}
