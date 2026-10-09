import Link from "next/link";
import { PRODUCTS, priceWithGst } from "@/lib/monetization/price";

/** Offer of the paid version of the same free service: the Detailed Rashifal. */
export function RashifalCta({ lead }: { lead: string }) {
  const price = priceWithGst(PRODUCTS.RASHIFAL_REPORT);
  return (
    <section aria-label="Detailed Rashifal" className="paper-card space-y-3 p-6 sm:p-8">
      <p className="eyebrow">{lead}</p>
      <h2 className="text-2xl">Want your detailed rashifal?</h2>
      <p className="text-mist">
        Your next 12 months, month by month, from your own birth chart — not just your Moon sign.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <Link
          href="/rashifal-report"
          className="inline-flex min-h-12 items-center rounded-full bg-[#2a1e17] px-7 font-semibold text-[#f7efe2]"
        >
          Get Detailed Rashifal — {price.headline}
        </Link>
        <span className="text-sm text-mist">{price.total} · one-time</span>
      </div>
    </section>
  );
}
