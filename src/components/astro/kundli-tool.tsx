"use client";

import { useLang } from "@/components/i18n/i18n";
import type { Language } from "@/lib/i18n/languages";
import { localeFor } from "@/lib/i18n/languages";
import { useT } from "@/components/i18n/i18n";
import { T } from "@/components/i18n/i18n";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { computeChart, currentDasha, type Chart } from "@/lib/astro/chart";
import { GRAHA_NAMES, NAKSHATRAS, RASHIS } from "@/lib/astro/constants";
import { ApiClientError, postJson } from "@/lib/api-client";
import { BirthFields, emptyBirth, parseBirth, type BirthDetails } from "./birth-form";
import { NorthIndianChart } from "./north-chart";

const STORE = "palmai.kundli";
const fmtDeg = (d: number) =>
  `${Math.floor(d)}°${String(Math.floor((d % 1) * 60)).padStart(2, "0")}′`;
const year = (iso: string) => new Date(iso).getFullYear();

export function KundliTool({ reportPriceLabel }: { reportPriceLabel: string }) {
  const tx = useT();
  const [values, setValues] = useState(emptyBirth);
  const [timeKnown, setTimeKnown] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ birth: BirthDetails; chart: Chart } | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) ?? "null");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore once from storage
      if (saved?.values) setValues({ ...emptyBirth(), ...saved.values });
      if (saved && saved.timeKnown === false) setTimeKnown(false);
    } catch {
      // storage unavailable
    }
  }, []);

  function submit() {
    const parsed = parseBirth(values, timeKnown);
    if (typeof parsed === "string") {
      setError(tx(parsed));
      return;
    }
    setError(null);
    try {
      localStorage.setItem(STORE, JSON.stringify({ values, timeKnown }));
    } catch {
      // ignore
    }
    setResult({ birth: parsed, chart: computeChart(parsed) });
    requestAnimationFrame(() =>
      document.getElementById("kundli-result")?.scrollIntoView({ behavior: "smooth" }),
    );
  }

  return (
    <div className="space-y-10">
      <form
        className="paper-card space-y-6 p-6 sm:p-8"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <BirthFields
          values={values}
          onChange={setValues}
          timeKnown={timeKnown}
          onTimeKnown={setTimeKnown}
        />
        {error ? (
          <Alert tone="error">
            <T s={error} />
          </Alert>
        ) : null}
        <Button type="submit" size="lg" className="w-full sm:w-auto">
          <T s="Make my Kundli — free" />
        </Button>
        <p className="text-xs text-mist">
          <T s="Calculated in your browser — your birth details aren't sent to us unless you ask for the full reading." />
        </p>
      </form>
      {result ? <KundliResult {...result} reportPriceLabel={reportPriceLabel} /> : null}
    </div>
  );
}

function KundliResult({
  birth,
  chart,
  reportPriceLabel,
}: {
  birth: BirthDetails;
  chart: Chart;
  reportPriceLabel: string;
}) {
  const tx = useT();
  const lang = useLang();
  const now = useMemo(() => currentDasha(chart.dasha), [chart]);
  const moonChart = !birth.timeKnown;
  const lagnaRashi = moonChart ? chart.moon.rashi : chart.lagna.rashi;
  const planets = chart.planets.map((p) => ({
    ...p,
    house: ((p.rashi - lagnaRashi + 12) % 12) + 1,
  }));
  const facts = [
    ...(moonChart
      ? []
      : [
          [
            tx("Lagna (ascendant)"),
            `${RASHIS[chart.lagna.rashi]!.name} ${fmtDeg(chart.lagna.degreeInSign)}`,
          ],
        ]),
    [
      tx("Moon sign (Rashi)"),
      `${RASHIS[chart.moon.rashi]!.name} · ${RASHIS[chart.moon.rashi]!.english}`,
    ],
    [tx("Nakshatra"), tx("{0}, pada {1}", [NAKSHATRAS[chart.moon.nakshatra]!, chart.moon.pada])],
    [tx("Sun sign (sidereal)"), RASHIS[chart.sunRashi]!.name],
    [
      tx("Current dasha"),
      now.maha
        ? `${now.maha.lord} mahadasha${now.antar ? ` · ${now.antar.lord} antardasha` : ""}`
        : "—",
    ],
  ];

  return (
    <section id="kundli-result" className="space-y-8" aria-labelledby="kundli-title">
      <div>
        <p className="eyebrow">
          <T s="Your Kundli" />
        </p>
        <h2 id="kundli-title" className="text-3xl">
          {birth.name ? tx("{0}'s birth chart", [birth.name]) : tx("Your birth chart")}
        </h2>
        <p className="mt-1 text-sm text-mist">
          <T
            s="{0}{1} · {2} · Lahiri ayanamsa"
            v={[
              new Date(Date.UTC(birth.year, birth.month - 1, birth.day)).toLocaleDateString(
                localeFor(lang as Language),
                {
                  dateStyle: "long",
                  timeZone: "UTC",
                },
              ),
              birth.timeKnown
                ? `, ${String(birth.hour).padStart(2, "0")}:${String(birth.minute).padStart(2, "0")}`
                : "",
              birth.placeName,
            ]}
          />
        </p>
      </div>
      {moonChart ? (
        <p className="note">
          <T s="Without a birth time the ascendant and houses can't be known, so this is a Chandra kundli (houses counted from your Moon sign). The Moon sign itself may differ if the Moon changed sign on your birthday." />
        </p>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div className="paper-card flex justify-center p-4">
          <NorthIndianChart
            lagnaRashi={lagnaRashi}
            planets={planets}
            title={moonChart ? tx("Chandra kundli") : tx("Lagna kundli")}
          />
        </div>
        <dl className="paper-card divide-y divide-[var(--rule)] p-2">
          {facts.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 px-4 py-3">
              <dt className="text-mist">{k}</dt>
              <dd className="text-right font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="paper-card overflow-x-auto p-2">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <caption className="px-4 pt-3 pb-2 text-left text-lg font-semibold">
            <T s="Planets (grahas)" />
          </caption>
          <thead className="text-mist">
            <tr>
              {[tx("Graha"), tx("Rashi"), tx("Degree"), tx("Nakshatra"), tx("House")].map((h) => (
                <th key={h} className="px-4 py-2 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--rule)]">
            {planets.map((p) => (
              <tr key={p.graha}>
                <td className="px-4 py-2">
                  {GRAHA_NAMES[p.graha].sanskrit} <span className="text-mist">({p.graha})</span>
                  {p.retrograde && p.graha !== "Rahu" && p.graha !== "Ketu" ? (
                    <span className="tag ml-2">
                      <T s="Retrograde" />
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-2">{RASHIS[p.rashi]!.name}</td>
                <td className="px-4 py-2">{fmtDeg(p.degreeInSign)}</td>
                <td className="px-4 py-2">
                  {NAKSHATRAS[p.nakshatra]} ({p.pada})
                </td>
                <td className="px-4 py-2">{p.house}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="paper-card p-6">
        <h3 className="text-xl">
          <T s="Vimshottari dasha" />
        </h3>
        <ol className="mt-4 grid gap-2 sm:grid-cols-3">
          {chart.dasha.map((d) => {
            const current = now.maha?.start === d.start;
            return (
              <li
                key={d.start}
                className={`rounded-xl border px-4 py-3 ${current ? "border-[var(--color-gold-400)] bg-[rgb(184_71_31/0.07)]" : "border-[var(--rule)]"}`}
              >
                <p className="font-medium">
                  {GRAHA_NAMES[d.lord].sanskrit} ({d.lord}){current ? tx(" · now") : ""}
                </p>
                <p className="text-sm text-mist">
                  {year(d.start)} – {year(d.end)}
                </p>
              </li>
            );
          })}
        </ol>
      </div>

      <KundliUpsell birth={birth} reportPriceLabel={reportPriceLabel} />
    </section>
  );
}

function KundliUpsell({
  birth,
  reportPriceLabel,
}: {
  birth: BirthDetails;
  reportPriceLabel: string;
}) {
  const tx = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="paper-card flex flex-col p-6 md:col-span-2">
        <p className="eyebrow">
          <T s="Mahakundli · 17 life areas · {0}" v={[reportPriceLabel]} />
        </p>
        <h3 className="mt-1 text-2xl">
          <T s="Marriage, career, money and 14 more answers" />
        </h3>
        <p className="mt-2 flex-1 text-mist">
          <T s="Each life area answered separately from this chart, with your running dasha and the next 3 years of major transits. Your first answer is free." />
        </p>
        <div className="mt-5">
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                const { kundliId } = await postJson<{ kundliId: string }>("/api/kundli", {
                  name: birth.name,
                  birth: {
                    year: birth.year,
                    month: birth.month,
                    day: birth.day,
                    hour: birth.hour,
                    minute: birth.minute,
                    lat: birth.lat,
                    lon: birth.lon,
                    tzMinutes: birth.tzMinutes,
                    placeName: birth.placeName,
                    timeKnown: birth.timeKnown,
                  },
                });
                router.push(`/kundli/${kundliId}`);
              } catch (err) {
                setError(err instanceof ApiClientError ? err.message : tx("Please try again."));
                setBusy(false);
              }
            }}
          >
            {busy ? tx("Reading your chart…") : tx("Get my first answer free")}
          </Button>
          {error ? (
            <Alert tone="error" className="mt-3">
              <T s={error} />
            </Alert>
          ) : null}
        </div>
      </div>
      <div className="paper-card flex flex-col gap-3 p-6">
        <h3 className="text-xl">
          <T s="More for you" />
        </h3>
        <Link href="/kundli-milan" className="link">
          <T s="Kundli Milan — check compatibility (free)" />
        </Link>
        <Link href="/horoscope" className="link">
          <T s="Today's rashifal (free)" />
        </Link>
        <Link href="/readers" className="link">
          <T s="Ask a reader your question" />
        </Link>
      </div>
    </div>
  );
}
