import type { Metadata } from "next";
import Link from "next/link";
import { MahakundliCta } from "@/components/astro/mahakundli-cta";
import { RashifalCta } from "@/components/astro/rashifal-cta";
import { SignGrid } from "@/components/astro/sign-grid";
import { SeoLanguageLinks } from "@/components/astro/seo-language-links";
import { todayIst } from "@/lib/horoscope/service";

export const metadata: Metadata = {
  title: "Aaj ka Rashifal — daily horoscope",
  description: "Free daily horoscope for all 12 Moon signs (rashis), in the Vedic tradition.",
  alternates: { canonical: "/horoscope" },
};

export default function HoroscopeIndex() {
  const today = todayIst();
  return (
    <div className="mx-auto max-w-5xl px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
      <header className="mb-8 max-w-2xl space-y-3">
        <p className="eyebrow">Aaj ka Rashifal · {today}</p>
        <h1 className="text-4xl sm:text-5xl">Today&apos;s horoscope</h1>
        <p className="text-lg text-mist">
          Choose your Moon sign (rashi). Don&apos;t know it?{" "}
          <Link href="/kundli" className="link">
            Find it free in your Kundli
          </Link>
          .
        </p>
      </header>
      <SignGrid />
      <section aria-labelledby="by-language" className="space-y-3">
        <h2 id="by-language" className="text-xl">
          Rashifal in your language
        </h2>
        <SeoLanguageLinks path="" />
      </section>
      <div className="mt-10">
        <RashifalCta lead="Beyond the daily rashifal" />
        <MahakundliCta lead="Beyond your Moon sign" />
      </div>
    </div>
  );
}
