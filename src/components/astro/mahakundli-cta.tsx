import Link from "next/link";
import { LIFE_AREAS } from "@/lib/kundli/areas";
import { PRODUCTS, priceWithGst } from "@/lib/monetization/price";

/**
 * The paid next step after any free tool: a rashifal or panchang is the same
 * for everyone; the Mahakundli is read from your own birth chart.
 */
export function MahakundliCta({ lead }: { lead: string }) {
  const price = priceWithGst(PRODUCTS.KUNDLI_REPORT);
  return (
    <section
      aria-label="Mahakundli"
      className="rounded-[1.5rem] bg-[#2a1e17] p-6 text-[#f7efe2] sm:p-8"
    >
      <p className="text-xs font-semibold tracking-[0.18em] text-[#f0c27b] uppercase">{lead}</p>
      <h2 className="mt-2 text-3xl text-[#f7efe2]">Get answers from your own Kundli</h2>
      <p className="mt-2 text-[#f7efe2]/80">
        Marriage, job, money, business and {LIFE_AREAS.length - 4} more life areas — each answered
        from your birth chart, with your running dasha and the next 3 years of transits.
      </p>
      <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        {LIFE_AREAS.slice(0, 4).map((a) => (
          <li key={a.id}>
            <Link
              href={`/mahakundli?area=${a.id}`}
              className="flex gap-2 rounded-xl border border-[#f7efe2]/20 p-3 hover:border-[#f0c27b]"
            >
              <span aria-hidden="true" className="text-[#f0c27b]">
                {a.icon}
              </span>
              {a.question}
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Link
          href="/mahakundli"
          className="inline-flex min-h-12 items-center rounded-full bg-[#f0c27b] px-7 font-semibold text-[#2a1e17] hover:bg-[#f5d39c]"
        >
          Get my first answer free ›
        </Link>
        <span className="text-sm text-[#f7efe2]/70">
          Then {price.headline} ({price.total}) for all {LIFE_AREAS.length} areas
        </span>
      </div>
    </section>
  );
}
