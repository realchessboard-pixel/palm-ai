"use client";

import { Fragment, createContext, useCallback, useContext, type ReactNode } from "react";
import { interpolate, lookup, type Phrases } from "@/lib/i18n/phrases-client";

const I18nContext = createContext<{ lang: string; dict: Phrases }>({ lang: "en", dict: {} });

/** Gives every <T> and useT() below it the chosen language's phrases. */
export function I18nProvider({
  lang,
  dict,
  children,
}: {
  lang: string;
  dict: Phrases;
  children: ReactNode;
}) {
  return <I18nContext.Provider value={{ lang, dict }}>{children}</I18nContext.Provider>;
}

/** For strings in client components: t("Close"), t("Pay {0}", [price]). */
export function useT() {
  const { dict } = useContext(I18nContext);
  // Stable per language, so it is safe in effect dependency lists.
  return useCallback(
    (english: string, vars?: Record<string, string | number> | (string | number)[]) =>
      interpolate(lookup(dict, english), vars),
    [dict],
  );
}

export function useLang(): string {
  return useContext(I18nContext).lang;
}

/**
 * Translated text, usable from server and client components alike.
 * `s` is the English text; {0}, {1}… are filled with `v` (text, numbers or
 * elements — e.g. a link), in whatever order the translation puts them.
 */
export function T({ s, v }: { s: string; v?: ReactNode[] }) {
  const { dict } = useContext(I18nContext);
  const text = lookup(dict, s);
  if (!v || v.length === 0) return text;
  const parts = text.split(/\{(\d+)\}/);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 0 ? (
          part ? (
            <Fragment key={i}>{part}</Fragment>
          ) : null
        ) : (
          <Fragment key={i}>{v[Number(part)] ?? null}</Fragment>
        ),
      )}
    </>
  );
}
