import Link from "next/link";
import type { ReactNode } from "react";
import { MahakundliCta } from "@/components/astro/mahakundli-cta";
import { RashifalCta } from "@/components/astro/rashifal-cta";
import { SignGrid } from "@/components/astro/sign-grid";
import { WhatsAppShare } from "@/components/share/whatsapp-share";
import { RASHIS } from "@/lib/astro/constants";
import { siteConfig } from "@/lib/config/site";
import { getHoroscope, todayIst } from "@/lib/horoscope/service";
import type { Language } from "@/lib/i18n/languages";
import { translator } from "@/lib/i18n/ui";
import { READER_TIERS, formatInr } from "@/lib/monetization/price";

/** Today's rashifal for one sign; shared by /horoscope/<sign> and /rashifal/<lang>/<sign>. */
export async function HoroscopeDay({
  index,
  language,
  heading,
  languageControl,
  sharePath,
}: {
  index: number;
  language: Language;
  /** Optional localized page heading (search pages). */
  heading?: string;
  languageControl: ReactNode;
  /** Path shared on WhatsApp. */
  sharePath: string;
}) {
  const today = todayIst();
  const h = await getHoroscope(index, language, today);
  const r = RASHIS[index]!;
  const tr = translator(language);
  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Aaj ka Rashifal · {today}</p>
          <h1 className="text-4xl sm:text-5xl">
            {heading ?? (
              <>
                {r.name}{" "}
                <span className="text-mist" lang="hi">
                  {r.hindi}
                </span>
              </>
            )}
          </h1>
          <p className="text-mist">
            {r.english} Moon sign · ruled by {r.lord}
          </p>
        </div>
        {languageControl}
      </header>
      <article lang={language} className="paper-card space-y-5 p-6 sm:p-8">
        <h2 className="text-2xl text-gold-200">{h.title}</h2>
        <p className="reading-prose leading-relaxed">{h.text}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="font-semibold">{tr("rashifal.love")}</h3>
            <p className="mt-1 text-mist">{h.love}</p>
          </div>
          <div>
            <h3 className="font-semibold">{tr("rashifal.work")}</h3>
            <p className="mt-1 text-mist">{h.work}</p>
          </div>
        </div>
        <p className="note">
          {tr("rashifal.tip")}: {h.tip}
        </p>
        <p className="text-sm">
          {tr("rashifal.color")}: <strong>{h.luckyColor}</strong> · {tr("rashifal.number")}:{" "}
          <strong>{h.luckyNumber}</strong>
        </p>
      </article>
      <WhatsAppShare
        context="rashifal"
        text={`${heading ?? `${r.name} (${r.hindi}) rashifal today`}: ${h.title}`}
        url={`${siteConfig.url}${sharePath}`}
        label="Send to family on WhatsApp"
      />
      <RashifalCta lead={`${r.name} · Detailed Rashifal`} />
      <MahakundliCta lang={language} lead={`${r.name} · ${tr("cta.title")}`} />
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
          {tr("rashifal.other")}
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
