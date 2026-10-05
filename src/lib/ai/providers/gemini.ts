import "server-only";
import { AiError, type AiProvider, type AiRequest, type AiResponse } from "../types";
import { postJson } from "./http";

interface GenerateContentResponse {
  modelVersion?: string;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    thoughtsTokenCount?: number;
    promptTokensDetails?: { modality?: string; tokenCount?: number }[];
  };
  promptFeedback?: { blockReason?: string };
  candidates?: {
    content?: { parts?: { text?: string; thought?: boolean }[] };
    finishReason?: string;
  }[];
}

/**
 * Gemini "thinking" models count reasoning tokens against maxOutputTokens, so
 * the visible-output budget the pipeline asks for gets this much headroom on
 * top. Only tokens actually generated are billed.
 */
export const GEMINI_THINKING_HEADROOM = 16_384;
const GEMINI_MAX_OUTPUT_TOKENS = 65_536;

/** Finish reasons that mean the response was withheld by Google's safety systems. */
const BLOCKED_FINISH_REASONS = new Set([
  "SAFETY",
  "RECITATION",
  "BLOCKLIST",
  "PROHIBITED_CONTENT",
  "SPII",
  "IMAGE_SAFETY",
]);

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

    let json: GenerateContentResponse;
    try {
      json = (await postJson(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(request.model)}:generateContent`,
        {
          systemInstruction: { parts: [{ text: request.system }] },
          contents: [{ role: "user", parts }],
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: Math.min(
              GEMINI_MAX_OUTPUT_TOKENS,
              request.maxTokens + GEMINI_THINKING_HEADROOM,
            ),
            ...(request.thinking ? { thinkingConfig: { thinkingLevel: request.thinking } } : {}),
          },
        },
        // The key travels in a header (never the URL) so it can't leak into logs.
        { "x-goog-api-key": this.options.apiKey },
        request.signal,
        "Gemini",
      )) as GenerateContentResponse;
    } catch (error) {
      // Gemini reports a bad key as HTTP 400 API_KEY_INVALID; treat it as a configuration problem.
      if (error instanceof AiError && /API_KEY_INVALID|API key not valid/i.test(error.message)) {
        throw new AiError("auth", "Gemini rejected the API key", { cause: error });
      }
      throw error;
    }

    if (json.promptFeedback?.blockReason)
      throw new AiError("refused", `Gemini blocked: ${json.promptFeedback.blockReason}`);
    const candidate = json.candidates?.[0];
    if (candidate?.finishReason && BLOCKED_FINISH_REASONS.has(candidate.finishReason)) {
      throw new AiError("refused", `Gemini stopped: ${candidate.finishReason}`);
    }
    if (candidate?.finishReason === "MAX_TOKENS")
      throw new AiError("empty", "Gemini output truncated");
    const text = candidate?.content?.parts
      ?.filter((p) => !p.thought)
      .map((p) => p.text ?? "")
      .join("")
      .trim();
    if (!text) throw new AiError("empty", "Gemini returned no content");
    const meta = json.usageMetadata;
    return {
      text,
      model: json.modelVersion ?? request.model,
      usage: meta && {
        inputTokens: meta.promptTokenCount,
        imageTokens: meta.promptTokensDetails?.find((d) => d.modality === "IMAGE")?.tokenCount,
        outputTokens: meta.candidatesTokenCount,
        thinkingTokens: meta.thoughtsTokenCount,
      },
    };
  }
}
