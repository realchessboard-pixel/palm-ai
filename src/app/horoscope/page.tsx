import { getT } from "@/lib/i18n/server";
import { T } from "@/components/i18n/i18n";
import type { Metadata } from "next";
import Link from "next/link";
import { MahakundliCta } from "@/components/astro/mahakundli-cta";
import { RashifalCta } from "@/components/astro/rashifal-cta";
import { SignGrid } from "@/components/astro/sign-grid";
import { SeoLanguageLinks } from "@/components/astro/seo-language-links";
import { todayIst } from "@/lib/horoscope/service";

export async function generateMetadata(): Promise<Metadata> {
  const tx = await getT();
  return {
    title: tx("Aaj ka Rashifal — daily horoscope"),
    description: tx("Free daily horoscope for all 12 Moon signs (rashis), in the Vedic tradition."),
    alternates: { canonical: "/horoscope" },
  };
}

export default async function HoroscopeIndex() {
  const tx = await getT();
  const today = todayIst();
  return (
    <div className="mx-auto max-w-5xl px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
      <header className="mb-8 max-w-2xl space-y-3">
        <p className="eyebrow">
          <T s="Aaj ka Rashifal · {0}" v={[today]} />
        </p>
        <h1 className="text-4xl sm:text-5xl">
          <T s="Today's horoscope" />
        </h1>
        <p className="text-lg text-mist">
          <T
            s="Choose your Moon sign (rashi). Don't know it? {0}."
            v={[
              <Link key={0} href="/kundli" className="link">
                <T s="Find it free in your Kundli" />
              </Link>,
            ]}
          />
        </p>
      </header>
      <SignGrid />
      <section aria-labelledby="by-language" className="space-y-3">
        <h2 id="by-language" className="text-xl">
          <T s="Rashifal in your language" />
        </h2>
        <SeoLanguageLinks path="" />
      </section>
      <div className="mt-10">
        <RashifalCta lead={tx("Beyond the daily rashifal")} />
        <MahakundliCta lead={tx("Beyond your Moon sign")} />
      </div>
    </div>
  );
}
