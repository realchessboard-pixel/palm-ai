import type { Metadata } from "next";
import { RashifalStart } from "@/components/astro/rashifal-start";
import { PRODUCTS, priceWithGst } from "@/lib/monetization/price";

export const metadata: Metadata = {
  title: "Detailed Rashifal — your personal 12 months",
  description: "Your rashifal for the next 12 months, month by month, from your own birth chart.",
};

export default function RashifalReportStart() {
  const price = priceWithGst(PRODUCTS.RASHIFAL_REPORT);
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
      <header className="space-y-3">
        <p className="eyebrow">
          Detailed Rashifal · {price.headline} {price.total}
        </p>
        <h1 className="text-4xl sm:text-5xl">Your rashifal, made for you</h1>
        <p className="text-lg text-mist">
          The daily rashifal is the same for everyone with your Moon sign. The Detailed Rashifal is
          yours: the next 12 months, month by month, from your own birth chart and the real planet
          movements.
        </p>
      </header>
      <RashifalStart submitLabel="Continue" />
    </div>
  );
}
