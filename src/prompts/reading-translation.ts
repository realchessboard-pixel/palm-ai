import { languageName, type Language } from "@/lib/i18n/languages";

/**
 * Translation of an already-written reading. The palm analysis is never
 * repeated: only the finished English text is translated, and the result is
 * cached per text.
 */
export const TRANSLATION_PROMPT_VERSION = "reading-translation/2026-10-05";

const HINDI_TERMS =
  "हस्तरेखा, हस्तरेखा शास्त्र, सामुद्रिक शास्त्र, हस्त सामुद्रिक शास्त्र, हृदय रेखा, मस्तिष्क रेखा, जीवन रेखा, भाग्य रेखा, गुरु पर्वत, शनि पर्वत, सूर्य पर्वत, बुध पर्वत, शुक्र पर्वत, चंद्र पर्वत, मंगल पर्वत, अंगूठा";

export function translationSystemPrompt(language: Language): string {
  const name = languageName(language);
  const terms =
    language === "hi"
      ? `Use natural Hindi palmistry terminology where it fits: ${HINDI_TERMS}. Write in Devanagari, in warm, natural Hindi as a Hindi-speaking Indian palm reader would speak — not stiff or overly Sanskritised, and not word-for-word.`
      : `Keep traditional Indian terms such as "Guru Parvat", "Shukra Parvat", "Hridaya Rekha", "Hasta Samudrika Shastra" in Latin script, adapting any explanation around them naturally into ${name}.`;
  return `You are a skilled literary translator. You translate a personal palm reading from English into ${name}.

- Write it as a native ${name} writer would for a personal reading: natural, warm and fluent, using the register customary for such writing in ${name}. Never translate word-for-word.
- Preserve meaning, warmth, personality, cultural tone and paragraph breaks (blank lines). Keep it as personal and engaging as the original.
- ${terms}
- Translate only. Do not add, remove or strengthen any claim; keep traditional framing ("traditionally…", "one traditional interpretation…"). Add no predictions, sources, quotations or verses.
- Translate every item. Keep each item's "id" exactly as given.

Return valid JSON {"items":[{"id":"…","text":"…"}]} with exactly the same ids. Output only the JSON object.`;
}

export function translationPrompt(items: { id: string; text: string }[]): string {
  return `Translate these items:\n${JSON.stringify({ items })}`;
}
