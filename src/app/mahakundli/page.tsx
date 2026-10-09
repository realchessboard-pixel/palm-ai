import { T } from "@/components/i18n/i18n";
import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { MahakundliStart } from "@/components/astro/mahakundli-start";
import { getLanguage } from "@/lib/i18n/server";
import { translator } from "@/lib/i18n/ui";
import { LIFE_AREAS, lifeArea, type LifeAreaId } from "@/lib/kundli/areas";
import { PRODUCTS, priceWithGst } from "@/lib/monetization/price";

export async function generateMetadata(): Promise<Metadata> {
  const tx = await getT();
  return {
    title: tx("Mahakundli — 17 life areas from your chart"),
    description: tx(
      "Marriage, career, money, business, family and 12 more life areas, each answered from your Kundli. Your first answer is free.",
    ),
    alternates: { canonical: "/mahakundli" },
  };
}

export default async function MahakundliPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>;
}) {
  const { area } = await searchParams;
  const initial = (lifeArea(area ?? "")?.id ?? "marriage") as LifeAreaId;
  const price = priceWithGst(PRODUCTS.KUNDLI_REPORT);
  const tr = translator(await getLanguage());
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
      <header className="space-y-3">
        <p className="eyebrow">
          {tr("maha.eyebrow")} · {LIFE_AREAS.length}
        </p>
        <h1 className="text-4xl sm:text-5xl">{tr("maha.title")}</h1>
        <p className="text-lg text-mist">
          {tr("maha.intro")} <strong className="text-parchment">{price.headline}</strong> (
          <T s={price.total} />
          ).
        </p>
      </header>
      <MahakundliStart
        initialArea={initial}
        labels={{
          pick: tr("maha.pickArea"),
          details: tr("maha.details"),
          submit: tr("maha.submit"),
          busy: tr("maha.reading"),
          note: tr("home.mahaNote"),
          areas: Object.fromEntries(LIFE_AREAS.map((a) => [a.id, tr(`area.${a.id}.title`)])),
        }}
      />
    </div>
  );
}
