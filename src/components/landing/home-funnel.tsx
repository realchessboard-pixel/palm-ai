import Link from "next/link";
import { RASHIS } from "@/lib/astro/constants";
import { LIFE_AREAS } from "@/lib/kundli/areas";
import { PRODUCTS, READER_TIERS, formatInr, priceWithGst } from "@/lib/monetization/price";

const fromQuestion = Math.min(...Object.values(READER_TIERS).map((t) => t.singleInr));

/** Home page: the Mahakundli first, then palm reading and focused readings. */
export function HomeFunnel() {
  const price = priceWithGst(PRODUCTS.KUNDLI_REPORT);
  return (
    <div className="mx-auto max-w-5xl space-y-14 px-4 pt-10 pb-16 sm:px-6 sm:pt-14">
      <header className="space-y-4 text-center">
        <p className="eyebrow">Palm · Kundli · Rashifal</p>
        <h1 className="text-5xl leading-[1.05] sm:text-6xl">
          Readings prepared <span className="text-gold-gradient italic">for you alone.</span>
        </h1>
        <p className="mx-auto max-w-xl text-lg text-mist">
          Explore the path ahead from your birth chart, or see what your palm says about you.
        </p>
      </header>

      <section aria-labelledby="areas-title" className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Choose your reading</p>
            <h2 id="areas-title" className="mt-1 text-2xl">
              Important answers inside your Mahakundli
            </h2>
          </div>
          <p className="shrink-0 text-xs text-mist">{LIFE_AREAS.length} areas — swipe →</p>
        </div>
        <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0">
          {LIFE_AREAS.map((a, i) => (
            <li
              key={a.id}
              className={`w-[46%] shrink-0 snap-start sm:w-auto ${i >= 8 ? "sm:hidden" : ""}`}
            >
              <Link
                href={`/mahakundli?area=${a.id}`}
                className="paper-card flex h-full flex-col gap-2 p-4 transition-colors hover:border-[var(--color-gold-400)]"
              >
                <span aria-hidden="true" className="text-xl text-gold-400">
                  {a.icon}
                </span>
                <span className="text-xs font-semibold tracking-wide text-gold-300 uppercase">
                  {a.title}
                </span>
                <span className="text-sm leading-snug">{a.question}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="maha-title"
        className="overflow-hidden rounded-[1.75rem] bg-[#2a1e17] p-6 text-[#f7efe2] sm:p-10"
      >
        <div className="grid gap-8 md:grid-cols-[1.3fr_1fr] md:items-center">
          <div className="space-y-4">
            <p className="inline-block rounded-full border border-[#f7efe2]/30 px-3 py-1 text-[0.7rem] font-semibold tracking-widest uppercase">
              Not one question. One report for your kundli.
            </p>
            <p className="font-display text-xl text-[#f7efe2]/85">
              Marriage, money, career, family, property and {LIFE_AREAS.length - 5} more life areas
              in one report.
            </p>
            <h2 id="maha-title" className="text-5xl text-[#f0c27b]">
              Mahakundli
            </h2>
            <p className="text-[#f7efe2]/85">
              {LIFE_AREAS.length} life areas, each checked separately, with personal timing from
              your running dasha and the next 3 years of major transits.
            </p>
            <p className="text-sm text-[#f7efe2]/65">
              A reliable birth time and place give your Lagna, 12 houses and personal dasha dates.
            </p>
            <ul className="flex flex-wrap gap-2 text-xs">
              {["Running dasha", "Life-area timing", "Major transits"].map((t) => (
                <li key={t} className="rounded-full border border-[#f7efe2]/30 px-3 py-1">
                  {t}
                </li>
              ))}
            </ul>
            <p>
              <span className="text-2xl font-semibold">{price.headline}</span>{" "}
              <span className="text-sm text-[#f7efe2]/65">{price.total}</span>
            </p>
            <Link
              href="/mahakundli"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#f0c27b] px-7 font-semibold text-[#2a1e17] hover:bg-[#f5d39c]"
            >
              Get my first answer free ›
            </Link>
            <p className="text-xs text-[#f7efe2]/60">
              4 details · free to start · one personal answer before you pay
            </p>
          </div>
          <div aria-hidden="true" className="relative mx-auto aspect-square w-full max-w-xs">
            <div className="absolute inset-0 rounded-full border border-[#f0c27b]/40" />
            <div className="absolute inset-6 rounded-full border border-dashed border-[#f0c27b]/30" />
            {RASHIS.map((r, i) => {
              const angle = (i / 12) * 2 * Math.PI - Math.PI / 2;
              return (
                <span
                  key={r.name}
                  className="absolute -translate-x-1/2 -translate-y-1/2 text-sm text-[#f0c27b]"
                  style={{
                    left: `${50 + 42 * Math.cos(angle)}%`,
                    top: `${50 + 42 * Math.sin(angle)}%`,
                  }}
                  lang="hi"
                >
                  {r.hindi}
                </span>
              );
            })}
            <div className="absolute inset-[30%] flex flex-col items-center justify-center rounded-full bg-[#f0c27b]/10 text-center">
              <span className="text-xs tracking-widest">YOUR MAHA</span>
              <span className="font-display text-xl text-[#f0c27b]">KUNDLI ✦</span>
            </div>
          </div>
        </div>
      </section>

      <ol className="grid gap-3 text-sm sm:grid-cols-3">
        {[
          "Enter birth details",
          "See one answer free",
          `Open all ${LIFE_AREAS.length} life areas`,
        ].map((s, i) => (
          <li key={s} className="flex items-center gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-[var(--color-gold-400)] text-gold-300">
              {i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>

      <section aria-label="More readings" className="grid gap-4 md:grid-cols-2">
        <div className="paper-card flex flex-col p-6">
          <p className="eyebrow">Life path &amp; nature</p>
          <h2 className="mt-1 text-3xl">Palm Reading</h2>
          <p className="mt-2 flex-1 text-mist">
            Your right palm read in the Indian tradition: how you think, care and work, your
            strengths and the lines, parvats and markings of your hand.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2 text-xs">
            <li className="tag">How you think — free</li>
            <li className="tag">Full reading {formatInr(PRODUCTS.DETAILED_READING.priceInr)}</li>
          </ul>
          <Link href="/read" className="btn-primary mt-5 self-start">
            Read my palm ›
          </Link>
          <p className="mt-2 text-xs text-mist">Start free · Scan or upload</p>
        </div>
        <div className="flex flex-col rounded-[1.25rem] bg-[#2f4a63] p-6 text-[#f3efe6]">
          <p className="text-xs font-semibold tracking-[0.18em] uppercase opacity-80">
            One question, answered
          </p>
          <h2 className="mt-1 text-3xl text-[#f3efe6]">Ask a Reader</h2>
          <p className="mt-2 flex-1 opacity-85">
            Ask about your own palm or chart. Readers with their own style reply in your language
            within a minute.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2 text-xs">
            <li className="rounded-full border border-white/30 px-3 py-1">First question free</li>
            <li className="rounded-full border border-white/30 px-3 py-1">
              Then from {formatInr(fromQuestion)}
            </li>
          </ul>
          <Link
            href="/readers"
            className="mt-5 inline-flex min-h-12 items-center self-start rounded-full bg-[#f3efe6] px-6 font-semibold text-[#2f4a63]"
          >
            Ask a reader ›
          </Link>
        </div>
      </section>

      <section aria-labelledby="focused-title" className="space-y-4">
        <h2 id="focused-title" className="text-center text-sm tracking-[0.2em] text-mist uppercase">
          Or explore one thing
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["/kundli-milan", "Kundli Milan", "Guna Milan out of 36 — free"],
            [
              "/compatibility",
              "Couple Reading",
              `Both palms together — ${formatInr(PRODUCTS.COUPLE_COMPATIBILITY.priceInr)}`,
            ],
            ["/horoscope", "Aaj ka Rashifal", "Today for your Moon sign — free"],
            ["/kundli", "Free Kundli", "Chart, planets and dasha — free"],
          ].map(([href, title, text]) => (
            <li key={href}>
              <Link href={href!} className="paper-card block h-full p-4 text-center">
                <span className="block font-display text-lg">{title}</span>
                <span className="mt-1 block text-xs text-mist">{text}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-center text-xs text-mist">
          Every reading begins free · Pay only if you choose the full report ·{" "}
          <Link href="/pricing" className="link">
            All prices
          </Link>
        </p>
      </section>
    </div>
  );
}
