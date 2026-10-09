"use client";

import { T } from "@/components/i18n/i18n";
import { useT } from "@/components/i18n/i18n";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { ApiClientError, postJson } from "@/lib/api-client";
import { BirthFields, emptyBirth, parseBirth, type BirthDetails } from "./birth-form";

const toBirth = (b: BirthDetails) => ({
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
});

export function MilanTool() {
  const tx = useT();
  const router = useRouter();
  const [a, setA] = useState(emptyBirth);
  const [b, setB] = useState(emptyBirth);
  const [aTime, setATime] = useState(true);
  const [bTime, setBTime] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const pa = parseBirth(a, aTime);
    const pb = parseBirth(b, bTime);
    if (typeof pa === "string" || typeof pb === "string") {
      setError(
        typeof pa === "string"
          ? tx("Person 1: {0}", [tx(pa)])
          : tx("Person 2: {0}", [tx(pb as string)]),
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { milanId } = await postJson<{ milanId: string }>("/api/milan", {
        a: { name: pa.name, birth: toBirth(pa) },
        b: { name: pb.name, birth: toBirth(pb) },
      });
      router.push(`/kundli-milan/${milanId}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : tx("Please try again."));
      setBusy(false);
    }
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="paper-card p-6">
          <BirthFields
            legend={tx("Person 1 (traditionally the groom)")}
            values={a}
            onChange={setA}
            timeKnown={aTime}
            onTimeKnown={setATime}
          />
        </div>
        <div className="paper-card p-6">
          <BirthFields
            legend={tx("Person 2 (traditionally the bride)")}
            values={b}
            onChange={setB}
            timeKnown={bTime}
            onTimeKnown={setBTime}
          />
        </div>
      </div>
      {error ? (
        <Alert tone="error">
          <T s={error} />
        </Alert>
      ) : null}
      <Button type="submit" size="lg" disabled={busy}>
        {busy ? tx("Matching…") : tx("Match Kundlis — free")}
      </Button>
    </form>
  );
}
