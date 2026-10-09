import { getT } from "@/lib/i18n/server";
import { T } from "@/components/i18n/i18n";
import Link from "next/link";
import type { Language } from "@/lib/i18n/languages";
import { translator } from "@/lib/i18n/ui";
import { RASHIS } from "@/lib/astro/constants";
import { LIFE_AREAS } from "@/lib/kundli/areas";
import { PRODUCTS, READER_TIERS, formatInr, priceWithGst } from "@/lib/monetization/price";

const fromQuestion = Math.min(...Object.values(READER_TIERS).map((t) => t.singleInr));

/** Home page: the Mahakundli first, then palm reading and focused readings. */
export async function HomeFunnel({ lang }: { lang: Language }) {
  const tx = await getT();
  const tr = translator(lang);
  const price = priceWithGst(PRODUCTS.KUNDLI_REPORT);
  return (
    <div className="mx-auto max-w-5xl space-y-14 px-4 pt-10 pb-16 sm:px-6 sm:pt-14">
      <header className="space-y-4 text-center">
        <p className="eyebrow">{tr("home.eyebrow")}</p>
        <h1 className="text-5xl leading-[1.05] sm:text-6xl">
          {tr("home.title1")} <span className="text-gold-gradient italic">{tr("home.title2")}</span>
        </h1>
        <p className="mx-auto max-w-xl text-lg text-mist">{tr("home.subtitle")}</p>
      </header>

      <section aria-labelledby="areas-title" className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow">{tr("home.choose")}</p>
            <h2 id="areas-title" className="mt-1 text-2xl">
              {tr("home.inside")}
            </h2>
          </div>
          <p className="shrink-0 text-xs text-mist">
            {LIFE_AREAS.length} {tr("home.swipe")}
          </p>
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
                  {tr(`area.${a.id}.title`)}
                </span>
                <span className="text-sm leading-snug">{tr(`area.${a.id}.question`)}</span>
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
              {tr("home.notOne")}
            </p>
            <p className="font-display text-xl text-[#f7efe2]/85">{tr("home.mahaLead")}</p>
            <h2 id="maha-title" className="text-5xl text-[#f0c27b]">
              <T s="Mahakundli" />
            </h2>
            <p className="text-[#f7efe2]/85">
              {LIFE_AREAS.length} · {tr("home.mahaBody")}
            </p>
            <p className="text-sm text-[#f7efe2]/65">{tr("home.mahaNote")}</p>
            <ul className="flex flex-wrap gap-2 text-xs">
              {[tr("home.chipDasha"), tr("home.chipTiming"), tr("home.chipTransits")].map((t) => (
                <li key={t} className="rounded-full border border-[#f7efe2]/30 px-3 py-1">
                  {t}
                </li>
              ))}
            </ul>
            <p>
              <span className="text-2xl font-semibold">{price.headline}</span>{" "}
              <span className="text-sm text-[#f7efe2]/65">
                <T s={price.total} />
              </span>
            </p>
            <Link
              href="/mahakundli"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#f0c27b] px-7 font-semibold text-[#2a1e17] hover:bg-[#f5d39c]"
            >
              {tr("home.firstFree")}
            </Link>
            <p className="text-xs text-[#f7efe2]/60">{tr("home.fourDetails")}</p>
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
              <span className="text-xs tracking-widest">
                <T s="YOUR MAHA" />
              </span>
              <span className="font-display text-xl text-[#f0c27b]">
                <T s="KUNDLI ✦" />
              </span>
            </div>
          </div>
        </div>
      </section>

      <ol className="grid gap-3 text-sm sm:grid-cols-3">
        {[tr("home.step1"), tr("home.step2"), `${tr("home.step3")} (${LIFE_AREAS.length})`].map(
          (s, i) => (
            <li key={s} className="flex items-center gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-[var(--color-gold-400)] text-gold-300">
                {i + 1}
              </span>
              {s}
            </li>
          ),
        )}
      </ol>

      <section aria-label={tx("More readings")} className="grid gap-4 md:grid-cols-2">
        <div className="paper-card flex flex-col p-6">
          <p className="eyebrow">{tr("home.palmEyebrow")}</p>
          <h2 className="mt-1 text-3xl">{tr("home.palmTitle")}</h2>
          <p className="mt-2 flex-1 text-mist">{tr("home.palmBody")}</p>
          <ul className="mt-3 flex flex-wrap gap-2 text-xs">
            <li className="tag">{tr("home.palmFree")}</li>
            <li className="tag">
              {tr("home.palmFull")} {formatInr(PRODUCTS.DETAILED_READING.priceInr)}
            </li>
          </ul>
          <Link href="/read" className="btn-primary mt-5 self-start">
            {tr("home.palmCta")}
          </Link>
          <p className="mt-2 text-xs text-mist">{tr("home.palmStart")}</p>
        </div>
        <div className="flex flex-col rounded-[1.25rem] bg-[#2f4a63] p-6 text-[#f3efe6]">
          <p className="text-xs font-semibold tracking-[0.18em] uppercase opacity-80">
            {tr("home.askEyebrow")}
          </p>
          <h2 className="mt-1 text-3xl text-[#f3efe6]">{tr("home.askTitle")}</h2>
          <p className="mt-2 flex-1 opacity-85">{tr("home.askBody")}</p>
          <ul className="mt-3 flex flex-wrap gap-2 text-xs">
            <li className="rounded-full border border-white/30 px-3 py-1">{tr("home.askFree")}</li>
            <li className="rounded-full border border-white/30 px-3 py-1">
              {tr("home.askFrom")} {formatInr(fromQuestion)}
            </li>
          </ul>
          <Link
            href="/readers"
            className="mt-5 inline-flex min-h-12 items-center self-start rounded-full bg-[#f3efe6] px-6 font-semibold text-[#2f4a63]"
          >
            {tr("home.askCta")}
          </Link>
        </div>
      </section>

      <section aria-labelledby="focused-title" className="space-y-4">
        <h2 id="focused-title" className="text-center text-sm tracking-[0.2em] text-mist uppercase">
          {tr("home.explore")}
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["/kundli-milan", tr("nav.milan"), tr("home.milanText")],
            [
              "/compatibility",
              tr("home.coupleTitle"),
              `${tr("home.coupleText")} — ${formatInr(PRODUCTS.COUPLE_COMPATIBILITY.priceInr)}`,
            ],
            ["/horoscope", tr("nav.rashifal"), tr("home.rashifalText")],
            ["/kundli", tr("home.kundliTitle"), tr("home.kundliText")],
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
          {tr("home.beginsFree")} ·{" "}
          <Link href="/pricing" className="link">
            {tr("home.allPrices")}
          </Link>
        </p>
      </section>
    </div>
  );
}
