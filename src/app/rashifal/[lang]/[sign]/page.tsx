import { I18nProvider } from "@/components/i18n/i18n";
import { phrasesFor } from "@/lib/i18n/phrases";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HoroscopeDay } from "@/components/astro/horoscope-day";
import { SeoLanguageLinks } from "@/components/astro/seo-language-links";
import { RASHIS, SIGN_SLUGS } from "@/lib/astro/constants";
import { SEO_LANGUAGES, isSeoLanguage, seoTitle } from "@/lib/horoscope/seo";

type Params = Promise<{ lang: string; sign: string }>;

function resolve(lang: string, sign: string) {
  const index = SIGN_SLUGS.indexOf(sign as (typeof SIGN_SLUGS)[number]);
  return isSeoLanguage(lang) && index >= 0 ? { lang, index } : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, sign } = await params;
  const page = resolve(lang, sign);
  if (!page) return {};
  const r = RASHIS[page.index]!;
  return {
    title: `${seoTitle(page.lang, page.index)} — ${r.name} (${r.english})`,
    description: `${seoTitle(page.lang, page.index)}: ${r.name} (${r.english}) Moon sign — love, work, lucky colour and number, and a tip for the day.`,
    alternates: {
      canonical: `/rashifal/${lang}/${sign}`,
      languages: Object.fromEntries(SEO_LANGUAGES.map((l) => [l, `/rashifal/${l}/${sign}`])),
    },
  };
}

export default async function SeoSignPage({ params }: { params: Params }) {
  const { lang, sign } = await params;
  const page = resolve(lang, sign);
  if (!page) notFound();
  return (
    // Page text follows the language in the URL, whatever the visitor's own setting.
    <I18nProvider lang={page.lang} dict={phrasesFor(page.lang)}>
      <HoroscopeDay
        index={page.index}
        language={page.lang}
        heading={seoTitle(page.lang, page.index)}
        sharePath={`/rashifal/${lang}/${sign}`}
        languageControl={<SeoLanguageLinks current={page.lang} path={`/${sign}`} />}
      />
    </I18nProvider>
  );
}
