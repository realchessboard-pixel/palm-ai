/**
 * Extract a JSON object from model output. Only conservative, syntax-level
 * repairs are attempted (code fences, surrounding prose, trailing commas);
 * content is never guessed. The result is always schema-validated afterwards.
 * Nothing here evaluates code.
 */
export class JsonExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JsonExtractionError";
  }
}

export interface ExtractedJson {
  value: unknown;
  repaired: boolean;
}

function stripFences(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced ? fenced[1] : text;
}

function outermostObject(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return start >= 0 && end > start ? text.slice(start, end + 1) : null;
}

function removeTrailingCommas(text: string): string {
  // Remove commas directly before a closing bracket, outside of strings.
  let out = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      out += ch;
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }
    if (ch === ",") {
      const rest = text.slice(i + 1).match(/^\s*([}\]])/);
      if (rest) continue;
    }
    out += ch;
  }
  return out;
}

export function extractJson(raw: string): ExtractedJson {
  const text = raw.replace(/^﻿/, "").trim();
  if (!text) throw new JsonExtractionError("Empty response");

  try {
    return { value: JSON.parse(text), repaired: false };
  } catch {
    // fall through to repairs
  }

  const candidate = outermostObject(stripFences(text));
  if (!candidate) throw new JsonExtractionError("No JSON object found");
  try {
    return { value: JSON.parse(candidate), repaired: true };
  } catch {
    // fall through
  }
  try {
    return { value: JSON.parse(removeTrailingCommas(candidate)), repaired: true };
  } catch (error) {
    throw new JsonExtractionError(`Unparseable JSON: ${(error as Error).message}`);
  }
}
