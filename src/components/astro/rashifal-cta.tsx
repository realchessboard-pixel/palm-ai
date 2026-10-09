import type { Language } from "@/lib/i18n/languages";
import { getT } from "@/lib/i18n/server";
import { T } from "@/components/i18n/i18n";
import Link from "next/link";
import { PRODUCTS, priceWithGst } from "@/lib/monetization/price";

/** Offer of the paid version of the same free service: the Detailed Rashifal. */
export async function RashifalCta({ lead, lang }: { lead: string; lang?: Language }) {
  const tx = await getT(lang);
  const price = priceWithGst(PRODUCTS.RASHIFAL_REPORT);
  return (
    <section aria-label={tx("Detailed Rashifal")} className="paper-card space-y-3 p-6 sm:p-8">
      <p className="eyebrow">{lead}</p>
      <h2 className="text-2xl">
        <T s="Want your detailed rashifal?" />
      </h2>
      <p className="text-mist">
        <T s="Your next 12 months, month by month, from your own birth chart — not just your Moon sign." />
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <Link
          href="/rashifal-report"
          className="inline-flex min-h-12 items-center rounded-full bg-[#2a1e17] px-7 font-semibold text-[#f7efe2]"
        >
          <T s="Get Detailed Rashifal — {0}" v={[price.headline]} />
        </Link>
        <span className="text-sm text-mist">
          <T s="{0} · one-time" v={[<T key={0} s={price.total} />]} />
        </span>
      </div>
    </section>
  );
}
