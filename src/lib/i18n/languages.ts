/**
 * Languages a reading can be shown in. English is the canonical language:
 * readings are generated, grounded and safety-checked in English, then
 * translated on request (and cached), so changing language never repeats the
 * palm analysis.
 */
export const LANGUAGES = [
  { code: "en", label: "English", english: "English" },
  { code: "hi", label: "हिन्दी", english: "Hindi" },
  { code: "de", label: "Deutsch", english: "German" },
  { code: "es", label: "Español", english: "Spanish" },
  { code: "fr", label: "Français", english: "French" },
  { code: "pt", label: "Português", english: "Portuguese" },
  { code: "it", label: "Italiano", english: "Italian" },
  { code: "id", label: "Bahasa Indonesia", english: "Indonesian" },
  { code: "ja", label: "日本語", english: "Japanese" },
  { code: "ko", label: "한국어", english: "Korean" },
] as const;

export type Language = (typeof LANGUAGES)[number]["code"];
export const DEFAULT_LANGUAGE: Language = "en";
export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code) as [Language, ...Language[]];

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (LANGUAGE_CODES as readonly string[]).includes(value);
}

export function parseLanguage(value: unknown): Language {
  return isLanguage(value) ? value : DEFAULT_LANGUAGE;
}

export function languageName(code: Language): string {
  return LANGUAGES.find((l) => l.code === code)!.english;
}
