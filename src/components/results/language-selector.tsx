"use client";

import { useEffect, useId } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DEFAULT_LANGUAGE, LANGUAGES, isLanguage, type Language } from "@/lib/i18n/languages";

const STORAGE_KEY = "palmai.language";

function remember(language: Language) {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Storage can be unavailable (private mode); the URL still carries the choice.
  }
}

/**
 * Changes the language of the reading itself (via `?lang=`). The page renders
 * the cached translation, or requests one; the palm is never re-analysed.
 */
export function LanguageSelector({ value, label }: { value: Language; label: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const id = useId();

  function go(language: Language, replace = false) {
    const params = new URLSearchParams(searchParams.toString());
    if (language === DEFAULT_LANGUAGE) params.delete("lang");
    else params.set("lang", language);
    const query = params.toString();
    const href = query ? `${pathname}?${query}` : pathname;
    if (replace) router.replace(href, { scroll: false });
    else router.push(href, { scroll: false });
  }

  // Open readings in the language this visitor chose last time.
  useEffect(() => {
    if (searchParams.has("lang")) return;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {
      saved = null;
    }
    if (isLanguage(saved) && saved !== DEFAULT_LANGUAGE) go(saved, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on first visit
  }, []);

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-xs text-mist">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => {
            const next = event.target.value;
            if (!isLanguage(next)) return;
            remember(next);
            go(next);
          }}
          className="min-h-11 appearance-none rounded-full border border-white/15 bg-night-900/80 py-2 pr-9 pl-4 text-sm text-parchment focus:border-gold-300 focus:outline-none"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code} lang={l.code}>
              {l.label}
            </option>
          ))}
        </select>
        <svg
          viewBox="0 0 20 20"
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-gold-300"
          aria-hidden="true"
        >
          <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </div>
    </div>
  );
}
