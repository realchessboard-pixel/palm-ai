import { afterEach, describe, expect, it, vi } from "vitest";
import { GEMINI_THINKING_HEADROOM, GeminiProvider } from "@/lib/ai/providers/gemini";
import { AiError, type AiRequest } from "@/lib/ai/types";

const provider = new GeminiProvider({ apiKey: "test-key", model: "gemini-test" });

function request(overrides: Partial<AiRequest> = {}): AiRequest {
  return {
    task: "palm_analysis",
    system: "system prompt",
    prompt: "user prompt",
    image: { data: Buffer.from([0xff, 0xd8, 0xff, 0x01]), mediaType: "image/jpeg" },
    model: "gemini-test",
    maxTokens: 6000,
    signal: new AbortController().signal,
    ...overrides,
  };
}

function mockGemini(body: unknown, status = 200) {
  return vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

const ok = (parts: { text?: string; thought?: boolean }[], finishReason = "STOP") => ({
  modelVersion: "gemini-test-001",
  candidates: [{ content: { parts }, finishReason }],
});

describe("GeminiProvider", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends the image inline with the system prompt in JSON mode, key in a header", async () => {
    const fetchMock = mockGemini(ok([{ text: '{"a":1}' }]));
    const result = await provider.complete(request());
    expect(result).toEqual({ text: '{"a":1}', model: "gemini-test-001" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent",
    );
    expect(String(url)).not.toContain("test-key");
    expect((init!.headers as Record<string, string>)["x-goog-api-key"]).toBe("test-key");
    const body = JSON.parse(String(init!.body));
    expect(body.systemInstruction.parts[0].text).toBe("system prompt");
    expect(body.contents[0].parts[0].inline_data).toEqual({
      mime_type: "image/jpeg",
      data: Buffer.from([0xff, 0xd8, 0xff, 0x01]).toString("base64"),
    });
    expect(body.contents[0].parts[1].text).toBe("user prompt");
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    // Thinking tokens share the output budget, so headroom is added.
    expect(body.generationConfig.maxOutputTokens).toBe(6000 + GEMINI_THINKING_HEADROOM);
  });

  it("omits the image part for text-only (interpretation) requests", async () => {
    const fetchMock = mockGemini(ok([{ text: "{}" }]));
    await provider.complete(request({ image: undefined, task: "palm_interpretation" }));
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]!.body));
    expect(body.contents[0].parts).toEqual([{ text: "user prompt" }]);
  });

  it("ignores thought parts", async () => {
    mockGemini(ok([{ text: "thinking...", thought: true }, { text: '{"b":2}' }]));
    expect((await provider.complete(request())).text).toBe('{"b":2}');
  });

  it.each(["SAFETY", "PROHIBITED_CONTENT", "IMAGE_SAFETY", "RECITATION"])(
    "treats finishReason %s as a refusal",
    async (reason) => {
      mockGemini(ok([], reason));
      await expect(provider.complete(request())).rejects.toMatchObject({ kind: "refused" });
    },
  );

  it("treats truncated or empty output as retryable", async () => {
    mockGemini(ok([{ text: '{"a":' }], "MAX_TOKENS"));
    await expect(provider.complete(request())).rejects.toMatchObject({
      kind: "empty",
      retryable: true,
    });
    vi.restoreAllMocks();
    mockGemini({ candidates: [] });
    await expect(provider.complete(request())).rejects.toMatchObject({ kind: "empty" });
  });

  it("maps an invalid API key to an auth error and other HTTP errors by status", async () => {
    mockGemini(
      {
        error: { code: 400, status: "INVALID_ARGUMENT", details: [{ reason: "API_KEY_INVALID" }] },
      },
      400,
    );
    await expect(provider.complete(request())).rejects.toMatchObject({ kind: "auth" });
    vi.restoreAllMocks();
    mockGemini({ error: { code: 429 } }, 429);
    await expect(provider.complete(request())).rejects.toMatchObject({ kind: "rate_limited" });
    vi.restoreAllMocks();
    mockGemini({ error: { code: 503 } }, 503);
    const error = await provider.complete(request()).catch((e) => e);
    expect(error).toBeInstanceOf(AiError);
    expect(error.kind).toBe("unavailable");
  });

  it("reports prompt-level blocks as refusals", async () => {
    mockGemini({ promptFeedback: { blockReason: "SAFETY" } });
    await expect(provider.complete(request())).rejects.toMatchObject({ kind: "refused" });
  });
});
