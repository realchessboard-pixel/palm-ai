import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HoroscopeDay } from "@/components/astro/horoscope-day";
import { LanguageSelector } from "@/components/results/language-selector";
import { RASHIS, SIGN_SLUGS } from "@/lib/astro/constants";
import { getLanguage } from "@/lib/i18n/server";
import { translator } from "@/lib/i18n/ui";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sign: string }>;
}): Promise<Metadata> {
  const { sign } = await params;
  const i = SIGN_SLUGS.indexOf(sign as (typeof SIGN_SLUGS)[number]);
  if (i < 0) return {};
  return {
    title: `${RASHIS[i]!.name} (${RASHIS[i]!.english}) horoscope today`,
    description: `Today's rashifal for ${RASHIS[i]!.name} Moon sign — love, work and a tip for the day.`,
    alternates: { canonical: `/horoscope/${sign}` },
  };
}

export default async function SignPage({
  params,
  searchParams,
}: {
  params: Promise<{ sign: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { sign } = await params;
  const { lang } = await searchParams;
  const index = SIGN_SLUGS.indexOf(sign as (typeof SIGN_SLUGS)[number]);
  if (index < 0) notFound();
  const language = await getLanguage(lang);
  const tr = translator(language);
  return (
    <HoroscopeDay
      index={index}
      language={language}
      sharePath={`/horoscope/${sign}`}
      languageControl={<LanguageSelector value={language} label={tr("nav.language")} />}
    />
  );
}
