"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { computeChart } from "@/lib/astro/chart";
import { NAKSHATRAS, RASHIS } from "@/lib/astro/constants";
import { gunaMilan, milanSummary, type MilanResult } from "@/lib/astro/milan";
import { BirthFields, emptyBirth, parseBirth } from "./birth-form";
import { MahakundliCta } from "./mahakundli-cta";

interface Person {
  name: string;
  rashi: number;
  nakshatra: number;
}

export function MilanTool({ couplePriceLabel }: { couplePriceLabel: string }) {
  const [a, setA] = useState(emptyBirth);
  const [b, setB] = useState(emptyBirth);
  const [aTime, setATime] = useState(true);
  const [bTime, setBTime] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ a: Person; b: Person; milan: MilanResult } | null>(null);

  function submit() {
    const pa = parseBirth(a, aTime);
    const pb = parseBirth(b, bTime);
    if (typeof pa === "string" || typeof pb === "string") {
      setError(typeof pa === "string" ? `Person 1: ${pa}` : `Person 2: ${pb}`);
      return;
    }
    setError(null);
    const ca = computeChart(pa);
    const cb = computeChart(pb);
    const A = { name: pa.name || "Person 1", rashi: ca.moon.rashi, nakshatra: ca.moon.nakshatra };
    const B = { name: pb.name || "Person 2", rashi: cb.moon.rashi, nakshatra: cb.moon.nakshatra };
    setResult({ a: A, b: B, milan: gunaMilan(A, B) });
    requestAnimationFrame(() =>
      document.getElementById("milan-result")?.scrollIntoView({ behavior: "smooth" }),
    );
  }

  return (
    <div className="space-y-10">
      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="paper-card p-6">
            <BirthFields
              legend="Person 1 (traditionally the groom)"
              values={a}
              onChange={setA}
              timeKnown={aTime}
              onTimeKnown={setATime}
            />
          </div>
          <div className="paper-card p-6">
            <BirthFields
              legend="Person 2 (traditionally the bride)"
              values={b}
              onChange={setB}
              timeKnown={bTime}
              onTimeKnown={setBTime}
            />
          </div>
        </div>
        {error ? <Alert tone="error">{error}</Alert> : null}
        <Button type="submit" size="lg">
          Match Kundlis — free
        </Button>
      </form>

      {result ? (
        <section id="milan-result" className="space-y-6" aria-labelledby="milan-title">
          <div className="paper-card p-6 sm:p-8">
            <p className="eyebrow">Ashtakoota Guna Milan</p>
            <h2 id="milan-title" className="mt-1 text-4xl">
              {result.milan.total} <span className="text-2xl text-mist">/ 36 gunas</span>
            </h2>
            <p className="mt-3 max-w-2xl">{milanSummary(result.milan.total)}</p>
            <p className="mt-3 text-sm text-mist">
              {result.a.name}: {RASHIS[result.a.rashi]!.name} Moon, {NAKSHATRAS[result.a.nakshatra]}{" "}
              · {result.b.name}: {RASHIS[result.b.rashi]!.name} Moon,{" "}
              {NAKSHATRAS[result.b.nakshatra]}
            </p>
          </div>
          <div className="paper-card overflow-x-auto p-2">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="text-mist">
                <tr>
                  {["Koota", result.a.name, result.b.name, "Points"].map((h) => (
                    <th key={h} className="px-4 py-2 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--rule)]">
                {result.milan.kootas.map((k) => (
                  <tr key={k.id}>
                    <td className="px-4 py-3">
                      <span className="font-medium">{k.name}</span>
                      <span className="block text-xs text-mist">{k.meaning}</span>
                    </td>
                    <td className="px-4 py-3">{k.a}</td>
                    <td className="px-4 py-3">{k.b}</td>
                    <td className="px-4 py-3 font-medium">
                      {k.score} / {k.max}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-mist">
            Based on the Moon sign and nakshatra of each person (Lahiri ayanamsa), using a common
            North Indian method; some tables (e.g. Yoni) are simplified and traditions differ. Guna
            Milan is one traditional lens — it doesn&apos;t decide a relationship.
          </p>
          <MahakundliCta lead="Guna Milan compares two Moon signs. Marriage is in the whole chart." />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="paper-card p-6">
              <h3 className="text-xl">Read your palms together</h3>
              <p className="mt-2 text-mist">
                A warm couple reading of both your palms — how you think, care and grow as a pair.{" "}
                {couplePriceLabel}.
              </p>
              <Link href="/compatibility" className="link mt-3 inline-block">
                Couple palm reading →
              </Link>
            </div>
            <div className="paper-card p-6">
              <h3 className="text-xl">Have a question?</h3>
              <p className="mt-2 text-mist">Talk it through with one of our readers.</p>
              <Link href="/readers" className="link mt-3 inline-block">
                Ask a reader →
              </Link>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
