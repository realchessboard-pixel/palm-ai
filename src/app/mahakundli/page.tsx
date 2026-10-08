import type { Metadata } from "next";
import { MahakundliStart } from "@/components/astro/mahakundli-start";
import { LIFE_AREAS, lifeArea, type LifeAreaId } from "@/lib/kundli/areas";
import { PRODUCTS, priceWithGst } from "@/lib/monetization/price";

export const metadata: Metadata = {
  title: "Mahakundli — 17 life areas from your chart",
  description:
    "Marriage, career, money, business, family and 12 more life areas, each answered from your Kundli. Your first answer is free.",
  alternates: { canonical: "/mahakundli" },
};

export default async function MahakundliPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>;
}) {
  const { area } = await searchParams;
  const initial = (lifeArea(area ?? "")?.id ?? "marriage") as LifeAreaId;
  const price = priceWithGst(PRODUCTS.KUNDLI_REPORT);
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
      <header className="space-y-3">
        <p className="eyebrow">Mahakundli · {LIFE_AREAS.length} life areas</p>
        <h1 className="text-4xl sm:text-5xl">One report for your whole kundli</h1>
        <p className="text-lg text-mist">
          Each life area checked separately, with your running dasha, life-area timing and the next
          3 years of major transits. Your first answer is free; the full Mahakundli is{" "}
          <strong className="text-parchment">{price.headline}</strong> ({price.total}).
        </p>
      </header>
      <MahakundliStart initialArea={initial} />
    </div>
  );
}
