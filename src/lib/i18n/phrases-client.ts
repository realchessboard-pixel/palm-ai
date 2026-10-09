/** Client-safe helpers shared by the server phrase table and <T>. */
export type Phrases = Record<string, string>;

/** Replace {0}, {1}, {name} … with values. */
export function interpolate(
  text: string,
  vars?: Record<string, string | number> | (string | number)[],
): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, k: string) => {
    const v = (vars as Record<string, string | number>)[k];
    return v === undefined ? m : String(v);
  });
}

/**
 * Look up a phrase. Keys are stored with whitespace collapsed and trimmed, so
 * the lookup does the same and puts any leading/trailing spaces back.
 */
export function lookup(dict: Phrases, english: string): string {
  const direct = dict[english];
  if (direct !== undefined) return direct;
  const key = english.replace(/\s+/g, " ").trim();
  const found = dict[key];
  if (found === undefined) return english;
  const lead = english.match(/^\s*/)![0] ? " " : "";
  const trail = english.match(/\s*$/)![0] ? " " : "";
  return lead + found + trail;
}
