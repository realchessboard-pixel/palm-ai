"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { ApiClientError, postJson } from "@/lib/api-client";
import { LIFE_AREAS, type LifeAreaId } from "@/lib/kundli/areas";
import { BirthFields, emptyBirth, parseBirth } from "./birth-form";

/** Step 1 of the Mahakundli: pick the area to answer free, enter 4 birth details. */
export function MahakundliStart({ initialArea }: { initialArea: LifeAreaId }) {
  const router = useRouter();
  const [area, setArea] = useState<LifeAreaId>(initialArea);
  const [values, setValues] = useState(emptyBirth);
  const [timeKnown, setTimeKnown] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const b = parseBirth(values, timeKnown);
    if (typeof b === "string") return setError(b);
    setBusy(true);
    setError(null);
    try {
      const { kundliId } = await postJson<{ kundliId: string }>("/api/kundli", {
        name: b.name,
        area,
        birth: {
          year: b.year,
          month: b.month,
          day: b.day,
          hour: b.hour,
          minute: b.minute,
          lat: b.lat,
          lon: b.lon,
          tzMinutes: b.tzMinutes,
          placeName: b.placeName,
          timeKnown: b.timeKnown,
        },
      });
      router.push(`/kundli/${kundliId}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Please try again.");
      setBusy(false);
    }
  }

  return (
    <form
      className="paper-card space-y-6 p-6 sm:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <fieldset>
        <legend className="mb-3 text-lg font-semibold">1. Which answer would you like free?</legend>
        <div className="flex flex-wrap gap-2">
          {LIFE_AREAS.map((a) => (
            <button
              key={a.id}
              type="button"
              aria-pressed={area === a.id}
              onClick={() => setArea(a.id)}
              className={`chip px-3 ${area === a.id ? "border-[var(--color-gold-400)] bg-[rgb(184_71_31/0.08)] text-gold-300" : ""}`}
            >
              <span aria-hidden="true">{a.icon}</span> {a.title}
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <p className="mb-3 text-lg font-semibold">2. Your birth details</p>
        <BirthFields
          values={values}
          onChange={setValues}
          timeKnown={timeKnown}
          onTimeKnown={setTimeKnown}
        />
      </div>
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={busy}>
        {busy ? "Reading your chart…" : "Get my first answer free"}
      </Button>
      <p className="text-xs text-mist">
        A reliable birth time and place give your Lagna, 12 houses and personal dasha dates.
      </p>
    </form>
  );
}
