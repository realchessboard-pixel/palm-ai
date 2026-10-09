"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { ApiClientError, postJson } from "@/lib/api-client";
import { BirthFields, emptyBirth, parseBirth } from "./birth-form";

/** Birth details for the Detailed Rashifal; the chart is saved, then the offer is shown. */
export function RashifalStart({ submitLabel }: { submitLabel: string }) {
  const router = useRouter();
  const [values, setValues] = useState(emptyBirth);
  const [timeKnown, setTimeKnown] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="paper-card space-y-6 p-6 sm:p-8"
      onSubmit={async (e) => {
        e.preventDefault();
        const b = parseBirth(values, timeKnown);
        if (typeof b === "string") return setError(b);
        setBusy(true);
        setError(null);
        try {
          const { kundliId } = await postJson<{ kundliId: string }>("/api/kundli", {
            name: b.name,
            purpose: "rashifal",
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
          router.push(`/rashifal-report/${kundliId}`);
        } catch (err) {
          setError(err instanceof ApiClientError ? err.message : "Please try again.");
          setBusy(false);
        }
      }}
    >
      <BirthFields
        values={values}
        onChange={setValues}
        timeKnown={timeKnown}
        onTimeKnown={setTimeKnown}
      />
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Button type="submit" size="lg" disabled={busy}>
        {busy ? "…" : submitLabel}
      </Button>
    </form>
  );
}
