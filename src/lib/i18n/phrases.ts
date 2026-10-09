import type { Language } from "./languages";
import { interpolate, lookup, type Phrases } from "./phrases-client";

export type { Phrases };
import hi from "./phrases/hi.json";
import bn from "./phrases/bn.json";
import mr from "./phrases/mr.json";
import te from "./phrases/te.json";
import ta from "./phrases/ta.json";
import gu from "./phrases/gu.json";
import kn from "./phrases/kn.json";
import ml from "./phrases/ml.json";
import pa from "./phrases/pa.json";
import or from "./phrases/or.json";
import de from "./phrases/de.json";
import es from "./phrases/es.json";
import fr from "./phrases/fr.json";
import pt from "./phrases/pt.json";
import it from "./phrases/it.json";
import id from "./phrases/id.json";
import ja from "./phrases/ja.json";
import ko from "./phrases/ko.json";

/**
 * Whole-site text translations, keyed by the English text itself (gettext
 * style), so any page can mark text with <T s="…" /> or t("…") without naming
 * keys. Filled by `npx tsx scripts/translate-phrases.mts`.
 */

const PHRASES: Partial<Record<Language, Phrases>> = {
  hi,
  bn,
  mr,
  te,
  ta,
  gu,
  kn,
  ml,
  pa,
  or,
  de,
  es,
  fr,
  pt,
  it,
  id,
  ja,
  ko,
};

export function phrasesFor(lang: Language): Phrases {
  return PHRASES[lang] ?? {};
}

export function translatePhrase(
  lang: Language,
  english: string,
  vars?: Record<string, string | number> | (string | number)[],
): string {
  return interpolate(lookup(phrasesFor(lang), english), vars);
}

/** Translate text paragraph by paragraph (paragraphs separated by blank lines). */
export function translateParagraphs(lang: Language, text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => translatePhrase(lang, p.replace(/\s+/g, " ").trim()))
    .join("\n\n");
}
