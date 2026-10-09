import { I18nProvider } from "@/components/i18n/i18n";
import { phrasesFor } from "@/lib/i18n/phrases";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SeoLanguageLinks } from "@/components/astro/seo-language-links";
import { RASHIS, SIGN_SLUGS } from "@/lib/astro/constants";
import { INDEX_TITLE, SEO_LANGUAGES, SIGN_NAMES, isSeoLanguage } from "@/lib/horoscope/seo";
import { todayIst } from "@/lib/horoscope/service";

type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  if (!isSeoLanguage(lang)) return {};
  return {
    title: INDEX_TITLE[lang],
    description: `${INDEX_TITLE[lang]} — ${SIGN_NAMES[lang].join(", ")}.`,
    alternates: {
      canonical: `/rashifal/${lang}`,
      languages: Object.fromEntries(SEO_LANGUAGES.map((l) => [l, `/rashifal/${l}`])),
    },
  };
}

export default async function SeoRashifalIndex({ params }: { params: Params }) {
  const { lang } = await params;
  if (!isSeoLanguage(lang)) notFound();
  return (
    <I18nProvider lang={lang} dict={phrasesFor(lang)}>
      <div lang={lang} className="mx-auto max-w-4xl space-y-8 px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
        <header className="space-y-4">
          <p className="eyebrow">{todayIst()}</p>
          <h1 className="text-4xl sm:text-5xl">{INDEX_TITLE[lang]}</h1>
          <SeoLanguageLinks current={lang} path="" />
        </header>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {RASHIS.map((r, i) => (
            <li key={r.name}>
              <Link
                href={`/rashifal/${lang}/${SIGN_SLUGS[i]}`}
                className="paper-card block p-4 text-center hover:border-[var(--color-gold-400)]"
              >
                <span className="block text-2xl">{SIGN_NAMES[lang][i]}</span>
                <span className="block text-xs text-mist" lang="en">
                  {r.name} · {r.english}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </I18nProvider>
  );
}
