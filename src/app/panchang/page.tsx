import { getLanguage } from "@/lib/i18n/server";
import { localeFor } from "@/lib/i18n/languages";
import { getT } from "@/lib/i18n/server";
import { T } from "@/components/i18n/i18n";
import type { Metadata } from "next";
import Link from "next/link";
import { MahakundliCta } from "@/components/astro/mahakundli-cta";
import { RashifalCta } from "@/components/astro/rashifal-cta";
import { computePanchang } from "@/lib/astro/chart";
import { RASHIS } from "@/lib/astro/constants";
import { DEFAULT_PLACE_ID, PLACES, findPlace } from "@/lib/astro/places";
import { todayIst } from "@/lib/horoscope/service";

export async function generateMetadata(): Promise<Metadata> {
  const tx = await getT();
  return {
    title: tx("Aaj ka Panchang — today's tithi, nakshatra & Rahu Kaal"),
    description: tx(
      "Today's Panchang for your city: tithi, nakshatra, yoga, karana, sunrise, sunset and Rahu Kaal.",
    ),
    alternates: { canonical: "/panchang" },
  };
}

const time = (iso: string | null, tz: number) =>
  iso ? new Date(new Date(iso).getTime() + tz * 60_000).toISOString().slice(11, 16) : "—";
type Tx = (english: string, vars?: (string | number)[]) => string;
const when = (tx: Tx, iso: string | null, tz: number, today: string) => {
  if (!iso) return "";
  const local = new Date(new Date(iso).getTime() + tz * 60_000).toISOString();
  return local.slice(0, 10) !== today
    ? tx("until {0} (next day)", [local.slice(11, 16)])
    : tx("until {0}", [local.slice(11, 16)]);
};

export default async function PanchangPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; date?: string }>;
}) {
  const tx = await getT();
  const locale = localeFor(await getLanguage());
  const { city, date } = await searchParams;
  const place = findPlace(city ?? "") ?? findPlace(DEFAULT_PLACE_ID)!;
  const day = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayIst();
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const p = computePanchang(place, { year: y, month: m, day: d });
  const tz = place.tzMinutes;
  const rows: [string, string][] = [
    [tx("Vara (day)"), `${p.vara.name} · ${p.vara.english}`],
    [tx("Tithi"), `${p.tithi.paksha} ${p.tithi.name} ${when(tx, p.tithi.endsAt, tz, day)}`],
    [tx("Nakshatra"), `${p.nakshatra.name} ${when(tx, p.nakshatra.endsAt, tz, day)}`],
    [tx("Yoga"), p.yoga],
    [tx("Karana"), p.karana],
    [tx("Sunrise"), time(p.sunrise, tz)],
    [tx("Sunset"), time(p.sunset, tz)],
    [tx("Moon sign"), RASHIS[p.moonRashi]!.name],
    [tx("Sun sign"), RASHIS[p.sunRashi]!.name],
    [
      tx("Rahu Kaal"),
      p.rahuKaal ? `${time(p.rahuKaal.start, tz)} – ${time(p.rahuKaal.end, tz)}` : "—",
    ],
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
      <header className="mb-8 space-y-3">
        <p className="eyebrow">
          <T s="Aaj ka Panchang" />
        </p>
        <h1 className="text-4xl sm:text-5xl">
          {new Date(`${day}T00:00:00Z`).toLocaleDateString(locale, {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          })}
        </h1>
        <form className="flex flex-wrap items-end gap-3" action="/panchang">
          <label className="text-sm text-mist">
            <T
              s="City{0}"
              v={[
                <select key={0} name="city" defaultValue={place.id} className="field mt-1 block">
                  {PLACES.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.name}
                    </option>
                  ))}
                </select>,
              ]}
            />
          </label>
          <label className="text-sm text-mist">
            <T
              s="Date{0}"
              v={[
                <input
                  key={0}
                  type="date"
                  name="date"
                  defaultValue={day}
                  className="field mt-1 block"
                />,
              ]}
            />
          </label>
          <button type="submit" className="btn-primary">
            <T s="Show" />
          </button>
        </form>
      </header>
      <dl className="paper-card divide-y divide-[var(--rule)] p-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-mist">{k}</dt>
            <dd className="text-right font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-mist">
        <T
          s="Values at sunrise in {0} (IST), Lahiri ayanamsa. Rahu Kaal is traditionally avoided for new beginnings. For festivals and muhurat, also follow your family's panchang."
          v={[place.name]}
        />
      </p>
      <div className="mt-10">
        <RashifalCta lead={tx("Beyond today's panchang")} />
        <MahakundliCta lead={tx("Today's panchang is for everyone. Your chart is only yours.")} />
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Link href="/horoscope" className="paper-card block p-5">
          <p className="text-lg">
            <T s="Today's rashifal →" />
          </p>
          <p className="text-sm text-mist">
            <T s="Free daily horoscope for your Moon sign" />
          </p>
        </Link>
        <Link href="/kundli" className="paper-card block p-5">
          <p className="text-lg">
            <T s="Free Kundli →" />
          </p>
          <p className="text-sm text-mist">
            <T s="Your birth chart, planets and dasha" />
          </p>
        </Link>
      </div>
    </div>
  );
}
