"use client";

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
      setError(parsed);
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
        {error ? <Alert tone="error">{error}</Alert> : null}
        <Button type="submit" size="lg" className="w-full sm:w-auto">
          Make my Kundli — free
        </Button>
        <p className="text-xs text-mist">
          Calculated in your browser — your birth details aren&apos;t sent to us unless you ask for
          the full reading.
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
            "Lagna (ascendant)",
            `${RASHIS[chart.lagna.rashi]!.name} ${fmtDeg(chart.lagna.degreeInSign)}`,
          ],
        ]),
    [
      "Moon sign (Rashi)",
      `${RASHIS[chart.moon.rashi]!.name} · ${RASHIS[chart.moon.rashi]!.english}`,
    ],
    ["Nakshatra", `${NAKSHATRAS[chart.moon.nakshatra]}, pada ${chart.moon.pada}`],
    ["Sun sign (sidereal)", RASHIS[chart.sunRashi]!.name],
    [
      "Current dasha",
      now.maha
        ? `${now.maha.lord} mahadasha${now.antar ? ` · ${now.antar.lord} antardasha` : ""}`
        : "—",
    ],
  ];

  return (
    <section id="kundli-result" className="space-y-8" aria-labelledby="kundli-title">
      <div>
        <p className="eyebrow">Your Kundli</p>
        <h2 id="kundli-title" className="text-3xl">
          {birth.name ? `${birth.name}'s` : "Your"} birth chart
        </h2>
        <p className="mt-1 text-sm text-mist">
          {new Date(Date.UTC(birth.year, birth.month - 1, birth.day)).toLocaleDateString("en-IN", {
            dateStyle: "long",
            timeZone: "UTC",
          })}
          {birth.timeKnown
            ? `, ${String(birth.hour).padStart(2, "0")}:${String(birth.minute).padStart(2, "0")}`
            : ""}{" "}
          · {birth.placeName} · Lahiri ayanamsa
        </p>
      </div>
      {moonChart ? (
        <p className="note">
          Without a birth time the ascendant and houses can&apos;t be known, so this is a Chandra
          kundli (houses counted from your Moon sign). The Moon sign itself may differ if the Moon
          changed sign on your birthday.
        </p>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div className="paper-card flex justify-center p-4">
          <NorthIndianChart
            lagnaRashi={lagnaRashi}
            planets={planets}
            title={moonChart ? "Chandra kundli" : "Lagna kundli"}
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
            Planets (grahas)
          </caption>
          <thead className="text-mist">
            <tr>
              {["Graha", "Rashi", "Degree", "Nakshatra", "House"].map((h) => (
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
                    <span className="tag ml-2">Retrograde</span>
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
        <h3 className="text-xl">Vimshottari dasha</h3>
        <ol className="mt-4 grid gap-2 sm:grid-cols-3">
          {chart.dasha.map((d) => {
            const current = now.maha?.start === d.start;
            return (
              <li
                key={d.start}
                className={`rounded-xl border px-4 py-3 ${current ? "border-[var(--color-gold-400)] bg-[rgb(184_71_31/0.07)]" : "border-[var(--rule)]"}`}
              >
                <p className="font-medium">
                  {GRAHA_NAMES[d.lord].sanskrit} ({d.lord}){current ? " · now" : ""}
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
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="paper-card flex flex-col p-6 md:col-span-2">
        <p className="eyebrow">Mahakundli · 17 life areas · {reportPriceLabel}</p>
        <h3 className="mt-1 text-2xl">Marriage, career, money and 14 more answers</h3>
        <p className="mt-2 flex-1 text-mist">
          Each life area answered separately from this chart, with your running dasha and the next 3
          years of major transits. Your first answer is free.
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
                setError(err instanceof ApiClientError ? err.message : "Please try again.");
                setBusy(false);
              }
            }}
          >
            {busy ? "Reading your chart…" : "Get my first answer free"}
          </Button>
          {error ? (
            <Alert tone="error" className="mt-3">
              {error}
            </Alert>
          ) : null}
        </div>
      </div>
      <div className="paper-card flex flex-col gap-3 p-6">
        <h3 className="text-xl">More for you</h3>
        <Link href="/kundli-milan" className="link">
          Kundli Milan — check compatibility (free)
        </Link>
        <Link href="/horoscope" className="link">
          Today&apos;s rashifal (free)
        </Link>
        <Link href="/readers" className="link">
          Ask a reader your question
        </Link>
      </div>
    </div>
  );
}
