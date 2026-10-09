"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LANGUAGES, LANGUAGE_COOKIE, type Language } from "@/lib/i18n/languages";

/** Indian languages first, then English, then the rest. */
const ORDER: Language[] = ["hi", "en", "bn", "mr", "te", "ta", "gu", "kn", "ml", "pa", "or", "de"];
const SORTED = [
  ...ORDER.map((c) => LANGUAGES.find((l) => l.code === c)!),
  ...LANGUAGES.filter((l) => !ORDER.includes(l.code)),
];

export function setLanguageCookie(code: Language) {
  document.cookie = `${LANGUAGE_COOKIE}=${code}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  try {
    localStorage.setItem("palmai.language", code);
  } catch {
    // ignore
  }
}

function Choices({ onPick, current }: { onPick: (c: Language) => void; current?: Language }) {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {SORTED.map((l) => (
        <li key={l.code}>
          <button
            type="button"
            lang={l.code}
            onClick={() => onPick(l.code)}
            className={`paper-card w-full px-3 py-3 text-left hover:border-[var(--color-gold-400)] ${current === l.code ? "border-[var(--color-gold-400)]" : ""}`}
          >
            <span className="block text-lg">{l.label}</span>
            <span className="block text-xs text-mist">{l.english}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** First visit: a full-screen language choice. */
export function FirstVisitLanguagePicker({ title, subtitle }: { title: string; subtitle: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lang-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-[var(--paper)] px-4 py-10"
    >
      <div className="mx-auto max-w-xl space-y-5">
        <p className="eyebrow text-center">AstroVidya</p>
        <h2 id="lang-title" className="text-center text-3xl">
          {title} · भाषा चुनें
        </h2>
        <p className="text-center text-sm text-mist">{subtitle}</p>
        <Choices
          onPick={(c) => {
            setLanguageCookie(c);
            setOpen(false);
            router.refresh();
          }}
        />
      </div>
    </div>
  );
}

/** Header control to change language later. */
export function LanguageMenu({ current, label }: { current: Language; label: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const here = LANGUAGES.find((l) => l.code === current)!;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        className="rounded-full border border-[var(--rule)] px-3 py-1.5 text-sm"
      >
        🌐 {here.label}
      </button>
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className="fixed inset-0 z-50 overflow-y-auto bg-[var(--paper)] px-4 py-10"
        >
          <div className="mx-auto max-w-xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl">{label}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-2xl"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <Choices
              current={current}
              onPick={(c) => {
                setLanguageCookie(c);
                setOpen(false);
                // Drop any ?lang= so the new choice applies everywhere.
                const url = new URL(window.location.href);
                url.searchParams.delete("lang");
                window.location.assign(url.toString());
              }}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
