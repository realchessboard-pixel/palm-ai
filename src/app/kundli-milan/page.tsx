import type { Metadata } from "next";
import { MilanTool } from "@/components/astro/milan-tool";
import { PRODUCTS, formatInr } from "@/lib/monetization/price";

export const metadata: Metadata = {
  title: "Kundli Milan — free Guna Milan online",
  description: "Free Kundli matching: Ashtakoota Guna Milan out of 36, with every koota explained.",
  alternates: { canonical: "/kundli-milan" },
};

export default function KundliMilanPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
      <header className="mb-8 max-w-2xl space-y-3">
        <p className="eyebrow">Kundli Milan</p>
        <h1 className="text-4xl sm:text-5xl">Match two Kundlis</h1>
        <p className="text-lg text-mist">
          Enter both birth details for the traditional Ashtakoota Guna Milan — all eight kootas,
          explained, out of 36.
        </p>
      </header>
      <MilanTool couplePriceLabel={formatInr(PRODUCTS.COUPLE_COMPATIBILITY.priceInr)} />
    </div>
  );
}
