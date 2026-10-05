import type { Metadata } from "next";
import { KundliTool } from "@/components/astro/kundli-tool";
import { PRODUCTS, formatInr } from "@/lib/monetization/price";

export const metadata: Metadata = {
  title: "Free Kundli — birth chart online",
  description:
    "Make your free Kundli: Lagna chart, planets, nakshatra and Vimshottari dasha, calculated with the Lahiri ayanamsa.",
  alternates: { canonical: "/kundli" },
};

export default function KundliPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
      <header className="mb-8 max-w-2xl space-y-3">
        <p className="eyebrow">Free Kundli</p>
        <h1 className="text-4xl sm:text-5xl">Your birth chart in a minute</h1>
        <p className="text-lg text-mist">
          Enter your birth details to see your Lagna kundli, the position of all nine grahas, your
          Moon sign and nakshatra, and your Vimshottari dasha periods.
        </p>
      </header>
      <KundliTool reportPriceLabel={formatInr(PRODUCTS.KUNDLI_REPORT.priceInr)} />
      <p className="mt-12 text-xs text-mist">
        Sidereal positions with the Lahiri ayanamsa; whole-sign houses. Jyotish is a traditional
        system offered for reflection and cultural interest — not a prediction or advice.
      </p>
    </div>
  );
}
