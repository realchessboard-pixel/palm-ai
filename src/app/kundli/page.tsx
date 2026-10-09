import { getT } from "@/lib/i18n/server";
import { T } from "@/components/i18n/i18n";
import type { Metadata } from "next";
import { KundliTool } from "@/components/astro/kundli-tool";
import { PRODUCTS, priceWithGst } from "@/lib/monetization/price";

export async function generateMetadata(): Promise<Metadata> {
  const tx = await getT();
  return {
    title: tx("Free Kundli — birth chart online"),
    description: tx(
      "Make your free Kundli: Lagna chart, planets, nakshatra and Vimshottari dasha, calculated with the Lahiri ayanamsa.",
    ),
    alternates: { canonical: "/kundli" },
  };
}

export default function KundliPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
      <header className="mb-8 max-w-2xl space-y-3">
        <p className="eyebrow">
          <T s="Free Kundli" />
        </p>
        <h1 className="text-4xl sm:text-5xl">
          <T s="Your birth chart in a minute" />
        </h1>
        <p className="text-lg text-mist">
          <T s="Enter your birth details to see your Lagna kundli, the position of all nine grahas, your Moon sign and nakshatra, and your Vimshottari dasha periods." />
        </p>
      </header>
      <KundliTool reportPriceLabel={priceWithGst(PRODUCTS.KUNDLI_REPORT).headline} />
      <p className="mt-12 text-xs text-mist">
        <T s="Sidereal positions with the Lahiri ayanamsa; whole-sign houses. Jyotish is a traditional system offered for reflection and cultural interest — not a prediction or advice." />
      </p>
    </div>
  );
}
