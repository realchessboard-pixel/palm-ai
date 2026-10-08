import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LanguageSelector } from "@/components/results/language-selector";
import { RASHIS, SIGN_SLUGS } from "@/lib/astro/constants";
import { getHoroscope, todayIst } from "@/lib/horoscope/service";
import { parseLanguage } from "@/lib/i18n/languages";
import { SignGrid } from "@/components/astro/sign-grid";
import { READER_TIERS, formatInr } from "@/lib/monetization/price";

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
  const language = parseLanguage(lang);
  const today = todayIst();
  const h = await getHoroscope(index, language, today);
  const r = RASHIS[index]!;

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Aaj ka Rashifal · {today}</p>
          <h1 className="text-4xl sm:text-5xl">
            {r.name}{" "}
            <span className="text-mist" lang="hi">
              {r.hindi}
            </span>
          </h1>
          <p className="text-mist">
            {r.english} Moon sign · ruled by {r.lord}
          </p>
        </div>
        <LanguageSelector value={language} label="Language" />
      </header>
      <article lang={language} className="paper-card space-y-5 p-6 sm:p-8">
        <h2 className="text-2xl text-gold-200">{h.title}</h2>
        <p className="reading-prose leading-relaxed">{h.text}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="font-semibold">Love &amp; family</h3>
            <p className="mt-1 text-mist">{h.love}</p>
          </div>
          <div>
            <h3 className="font-semibold">Work</h3>
            <p className="mt-1 text-mist">{h.work}</p>
          </div>
        </div>
        <p className="note">Tip for today: {h.tip}</p>
        <p className="text-sm">
          Lucky colour: <strong>{h.luckyColor}</strong> · Lucky number:{" "}
          <strong>{h.luckyNumber}</strong>
        </p>
      </article>
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/readers" className="paper-card block p-5">
          <p className="eyebrow">
            From {formatInr(Math.min(...Object.values(READER_TIERS).map((t) => t.singleInr)))}
          </p>
          <p className="mt-1 text-lg">Ask a reader about your day →</p>
        </Link>
        <Link href="/kundli" className="paper-card block p-5">
          <p className="eyebrow">Free</p>
          <p className="mt-1 text-lg">Make your Kundli →</p>
        </Link>
        <Link href="/read" className="paper-card block p-5">
          <p className="eyebrow">Free</p>
          <p className="mt-1 text-lg">Read your palm →</p>
        </Link>
      </div>
      <section aria-labelledby="other-signs" className="space-y-4">
        <h2 id="other-signs" className="text-2xl">
          Other signs
        </h2>
        <SignGrid />
      </section>
      <p className="text-xs text-mist">
        Based on today&apos;s Moon transit from your Moon sign. Traditional astrology for reflection
        — not a prediction.
      </p>
    </div>
  );
}
