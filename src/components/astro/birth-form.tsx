"use client";

import { useId, useState } from "react";
import { PLACES, DEFAULT_PLACE_ID, findPlace } from "@/lib/astro/places";
import type { BirthInput } from "@/lib/astro/chart";

export interface BirthDetails extends BirthInput {
  name: string;
  placeName: string;
  timeKnown: boolean;
}

export function emptyBirth(): Record<string, string> {
  return { name: "", date: "", time: "", place: DEFAULT_PLACE_ID, lat: "", lon: "", tz: "5.5" };
}

/** Parse the form values into birth details (or an error message). */
export function parseBirth(v: Record<string, string>, timeKnown: boolean): BirthDetails | string {
  if (!v.date) return "Please enter the date of birth.";
  const [y, m, d] = v.date.split("-").map(Number);
  if (!y || !m || !d || y < 1900 || y > 2100) return "Please enter a valid date of birth.";
  let hour = 12;
  let minute = 0;
  if (timeKnown) {
    if (!v.time) return "Please enter the time of birth (or tick “I don't know the time”).";
    [hour, minute] = v.time.split(":").map(Number) as [number, number];
  }
  let lat: number, lon: number, tzMinutes: number, placeName: string;
  if (v.place === "other") {
    lat = Number(v.lat);
    lon = Number(v.lon);
    tzMinutes = Math.round(Number(v.tz) * 60);
    if (!Number.isFinite(lat) || Math.abs(lat) > 66 || !Number.isFinite(lon) || Math.abs(lon) > 180)
      return "Please enter a valid latitude (−66 to 66) and longitude.";
    if (!Number.isFinite(tzMinutes) || Math.abs(tzMinutes) > 14 * 60)
      return "Please enter a valid UTC offset, e.g. 5.5 for India.";
    placeName = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
  } else {
    const place = findPlace(v.place ?? "") ?? findPlace(DEFAULT_PLACE_ID)!;
    ({ lat, lon, tzMinutes } = place);
    placeName = place.name;
  }
  return {
    name: (v.name ?? "").trim().slice(0, 60),
    year: y,
    month: m,
    day: d,
    hour,
    minute,
    lat,
    lon,
    tzMinutes,
    placeName,
    timeKnown,
  };
}

export function BirthFields({
  values,
  onChange,
  timeKnown,
  onTimeKnown,
  legend,
}: {
  values: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
  timeKnown: boolean;
  onTimeKnown: (known: boolean) => void;
  legend?: string;
}) {
  const id = useId();
  const set = (k: string) => (e: { target: { value: string } }) =>
    onChange({ ...values, [k]: e.target.value });
  const [showOther, setShowOther] = useState(values.place === "other");
  return (
    <fieldset className="space-y-4">
      {legend ? <legend className="mb-2 text-lg font-semibold">{legend}</legend> : null}
      <div>
        <label htmlFor={`${id}-name`} className="mb-1 block text-sm text-mist">
          Name (optional)
        </label>
        <input
          id={`${id}-name`}
          className="field w-full"
          value={values.name}
          onChange={set("name")}
          maxLength={60}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-date`} className="mb-1 block text-sm text-mist">
            Date of birth
          </label>
          <input
            id={`${id}-date`}
            type="date"
            className="field w-full"
            value={values.date}
            onChange={set("date")}
            min="1900-01-01"
            max="2100-12-31"
            required
          />
        </div>
        <div>
          <label htmlFor={`${id}-time`} className="mb-1 block text-sm text-mist">
            Time of birth
          </label>
          <input
            id={`${id}-time`}
            type="time"
            className="field w-full"
            value={values.time}
            onChange={set("time")}
            disabled={!timeKnown}
          />
          <label className="mt-2 flex items-center gap-2 text-sm text-mist">
            <input
              type="checkbox"
              checked={!timeKnown}
              onChange={(e) => onTimeKnown(!e.target.checked)}
              className="size-4 accent-gold-400"
            />
            I don&apos;t know the time
          </label>
        </div>
      </div>
      <div>
        <label htmlFor={`${id}-place`} className="mb-1 block text-sm text-mist">
          Place of birth
        </label>
        <select
          id={`${id}-place`}
          className="field w-full"
          value={values.place}
          onChange={(e) => {
            setShowOther(e.target.value === "other");
            set("place")(e);
          }}
        >
          {PLACES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}, {p.state}
            </option>
          ))}
          <option value="other">Somewhere else (enter coordinates)</option>
        </select>
      </div>
      {showOther ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {(
            [
              ["lat", "Latitude (e.g. 28.61)"],
              ["lon", "Longitude (e.g. 77.21)"],
              ["tz", "UTC offset (e.g. 5.5)"],
            ] as const
          ).map(([k, label]) => (
            <div key={k}>
              <label htmlFor={`${id}-${k}`} className="mb-1 block text-sm text-mist">
                {label}
              </label>
              <input
                id={`${id}-${k}`}
                inputMode="decimal"
                className="field w-full"
                value={values[k]}
                onChange={set(k)}
              />
            </div>
          ))}
        </div>
      ) : null}
    </fieldset>
  );
}
