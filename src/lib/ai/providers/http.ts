import "server-only";
import { AiError, kindForStatus } from "../types";

/** Shared JSON POST for REST-based providers, with normalised errors. */
export async function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string>,
  signal: AbortSignal,
  provider: string,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    const name = (error as { name?: string })?.name;
    if (name === "AbortError" || name === "TimeoutError") {
      throw new AiError("timeout", `${provider} request timed out`, { cause: error });
    }
    throw new AiError("unavailable", `${provider} network error`, { cause: error });
  }

  if (!response.ok) {
    // Read a little of the body for server logs only; it never reaches users.
    const detail = (await response.text().catch(() => "")).slice(0, 500);
    throw new AiError(
      kindForStatus(response.status),
      `${provider} HTTP ${response.status}: ${detail}`,
    );
  }
  try {
    return await response.json();
  } catch (error) {
    throw new AiError("empty", `${provider} returned a non-JSON envelope`, { cause: error });
  }
}
