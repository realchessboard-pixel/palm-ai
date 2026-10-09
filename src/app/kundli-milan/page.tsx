import { getT } from "@/lib/i18n/server";
import { T } from "@/components/i18n/i18n";
import type { Metadata } from "next";
import { MilanTool } from "@/components/astro/milan-tool";

export async function generateMetadata(): Promise<Metadata> {
  const tx = await getT();
  return {
    title: tx("Kundli Milan — free Guna Milan online"),
    description: tx(
      "Free Kundli matching: Ashtakoota Guna Milan out of 36, with every koota explained.",
    ),
    alternates: { canonical: "/kundli-milan" },
  };
}

export default function KundliMilanPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
      <header className="mb-8 max-w-2xl space-y-3">
        <p className="eyebrow">
          <T s="Kundli Milan" />
        </p>
        <h1 className="text-4xl sm:text-5xl">
          <T s="Match two Kundlis" />
        </h1>
        <p className="text-lg text-mist">
          <T s="Enter both birth details for the traditional Ashtakoota Guna Milan — all eight kootas, explained, out of 36. Your score is free; the detailed Milan explains every koota and both charts." />
        </p>
      </header>
      <MilanTool />
    </div>
  );
}
