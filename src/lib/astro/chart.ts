import * as A from "astronomy-engine";
import {
  DASHA_ORDER,
  KARANAS_MOVABLE,
  NAKSHATRAS,
  RASHIS,
  TITHIS,
  VARAS,
  YOGAS,
  type Graha,
} from "./constants";

/**
 * Vedic (sidereal) chart maths on top of astronomy-engine.
 *
 * Planet longitudes come from astronomy-engine in the J2000 ecliptic frame.
 * The Lahiri ayanamsa grows at almost exactly the rate of precession, so the
 * sidereal longitude is the J2000 longitude minus the J2000 Lahiri value
 * (23.853°), accurate to about an arc-minute. Lagna and Rahu are computed in
 * the frame of date and use the dated ayanamsa.
 */
const AYANAMSA_J2000 = 23.853;
const PRECESSION_DEG_PER_YEAR = 50.29 / 3600;
const NAK_SPAN = 360 / 27;
const DAY_MS = 86_400_000;
const YEAR_MS = 365.25 * DAY_MS;

export interface BirthInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  lat: number;
  lon: number;
  /** Minutes east of UTC (IST = 330). */
  tzMinutes: number;
}

export interface PlanetPosition {
  graha: Graha;
  longitude: number;
  rashi: number;
  degreeInSign: number;
  nakshatra: number;
  pada: number;
  house: number;
  retrograde: boolean;
}

export interface Chart {
  utc: string;
  lagna: { longitude: number; rashi: number; degreeInSign: number; nakshatra: number };
  planets: PlanetPosition[];
  moon: { rashi: number; nakshatra: number; pada: number; longitude: number };
  sunRashi: number;
  dasha: DashaPeriod[];
}

export interface DashaPeriod {
  lord: Graha;
  start: string;
  end: string;
  antar: { lord: Graha; start: string; end: string }[];
}

export const norm = (deg: number) => ((deg % 360) + 360) % 360;
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export function birthUtc(input: BirthInput): Date {
  return new Date(
    Date.UTC(input.year, input.month - 1, input.day, input.hour, input.minute) -
      input.tzMinutes * 60_000,
  );
}

function yearsSinceJ2000(date: Date): number {
  return (date.getTime() - Date.UTC(2000, 0, 1, 12)) / YEAR_MS;
}

export function ayanamsa(date: Date): number {
  return AYANAMSA_J2000 + yearsSinceJ2000(date) * PRECESSION_DEG_PER_YEAR;
}

const BODIES: Exclude<Graha, "Rahu" | "Ketu">[] = [
  "Sun",
  "Moon",
  "Mars",
  "Mercury",
  "Jupiter",
  "Venus",
  "Saturn",
];

/** Sidereal (Lahiri) longitude of a body at `date`. */
export function siderealLongitude(body: Exclude<Graha, "Rahu" | "Ketu">, date: Date): number {
  const time = A.MakeTime(date);
  const ecl = A.Ecliptic(A.GeoVector(body as A.Body, time, true));
  return norm(ecl.elon - AYANAMSA_J2000);
}

/** Mean lunar node (Rahu), sidereal. */
export function rahuLongitude(date: Date): number {
  const T = yearsSinceJ2000(date) / 100;
  const tropical = 125.04452 - 1934.136261 * T + 0.0020708 * T * T;
  return norm(tropical - ayanamsa(date));
}

/** Obliquity of the ecliptic (degrees, of date). */
function obliquity(date: Date): number {
  const T = yearsSinceJ2000(date) / 100;
  return 23.4392911 - 0.0130042 * T;
}

/** Local apparent sidereal time in degrees. */
export function localSiderealDegrees(date: Date, lon: number): number {
  return norm(A.SiderealTime(A.MakeTime(date)) * 15 + lon);
}

/** Tropical ascendant (of date) for a time and place. */
export function tropicalAscendant(date: Date, lat: number, lon: number): number {
  const ramc = rad(localSiderealDegrees(date, lon));
  const eps = rad(obliquity(date));
  const asc = Math.atan2(
    Math.cos(ramc),
    -(Math.sin(ramc) * Math.cos(eps) + Math.tan(rad(lat)) * Math.sin(eps)),
  );
  return norm(deg(asc));
}

export const rashiOf = (lon: number) => Math.floor(norm(lon) / 30);
export const nakshatraOf = (lon: number) => Math.floor(norm(lon) / NAK_SPAN);
export const padaOf = (lon: number) => Math.floor((norm(lon) % NAK_SPAN) / (NAK_SPAN / 4)) + 1;

export function computeChart(input: BirthInput): Chart {
  const date = birthUtc(input);
  const lagnaLon = norm(tropicalAscendant(date, input.lat, input.lon) - ayanamsa(date));
  const lagnaRashi = rashiOf(lagnaLon);
  const later = new Date(date.getTime() + DAY_MS / 2);

  const position = (graha: Graha, lon: number, retrograde: boolean): PlanetPosition => ({
    graha,
    longitude: lon,
    rashi: rashiOf(lon),
    degreeInSign: lon % 30,
    nakshatra: nakshatraOf(lon),
    pada: padaOf(lon),
    house: ((rashiOf(lon) - lagnaRashi + 12) % 12) + 1,
    retrograde,
  });

  const planets = BODIES.map((body) => {
    const lon = siderealLongitude(body, date);
    // Retrograde: longitude decreasing over the next half day (Sun and Moon never are).
    const delta = norm(siderealLongitude(body, later) - lon + 180) - 180;
    return position(body, lon, body !== "Sun" && body !== "Moon" && delta < 0);
  });
  const rahu = rahuLongitude(date);
  planets.push(position("Rahu", rahu, true), position("Ketu", norm(rahu + 180), true));

  const moon = planets.find((p) => p.graha === "Moon")!;
  const sun = planets.find((p) => p.graha === "Sun")!;
  return {
    utc: date.toISOString(),
    lagna: {
      longitude: lagnaLon,
      rashi: lagnaRashi,
      degreeInSign: lagnaLon % 30,
      nakshatra: nakshatraOf(lagnaLon),
    },
    planets,
    moon: {
      rashi: moon.rashi,
      nakshatra: moon.nakshatra,
      pada: moon.pada,
      longitude: moon.longitude,
    },
    sunRashi: sun.rashi,
    dasha: vimshottari(moon.longitude, date),
  };
}

/** Vimshottari mahadashas (with antardashas) from the Moon's position at birth. */
export function vimshottari(moonLongitude: number, birth: Date): DashaPeriod[] {
  const nak = nakshatraOf(moonLongitude);
  const first = nak % 9;
  const elapsed = (norm(moonLongitude) % NAK_SPAN) / NAK_SPAN;
  // The first dasha started before birth by the elapsed share of its length.
  let start = birth.getTime() - elapsed * DASHA_ORDER[first]!.years * YEAR_MS;
  const periods: DashaPeriod[] = [];
  for (let i = 0; i < 9; i++) {
    const { lord, years } = DASHA_ORDER[(first + i) % 9]!;
    const end = start + years * YEAR_MS;
    const antar: DashaPeriod["antar"] = [];
    let a = start;
    for (let j = 0; j < 9; j++) {
      const sub = DASHA_ORDER[(first + i + j) % 9]!;
      const len = ((years * sub.years) / 120) * YEAR_MS;
      antar.push({
        lord: sub.lord,
        start: new Date(a).toISOString(),
        end: new Date(a + len).toISOString(),
      });
      a += len;
    }
    periods.push({
      lord,
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      antar,
    });
    start = end;
  }
  return periods;
}

export function currentDasha(periods: DashaPeriod[], at: Date = new Date()) {
  const t = at.toISOString();
  const maha = periods.find((p) => p.start <= t && t < p.end) ?? null;
  const antar = maha?.antar.find((p) => p.start <= t && t < p.end) ?? null;
  return { maha, antar };
}

// ---------------------------------------------------------------- Panchang

export interface Panchang {
  date: string;
  sunrise: string | null;
  sunset: string | null;
  vara: (typeof VARAS)[number];
  tithi: { name: string; paksha: "Shukla" | "Krishna"; number: number; endsAt: string | null };
  nakshatra: { name: string; endsAt: string | null };
  yoga: string;
  karana: string;
  moonRashi: number;
  sunRashi: number;
  rahuKaal: { start: string; end: string } | null;
}

const elongation = (d: Date) => norm(siderealLongitude("Moon", d) - siderealLongitude("Sun", d));

/** First time after `from` when `fn` (an increasing angle mod 360) passes `target`. */
function findCrossing(fn: (d: Date) => number, from: Date, target: number): Date | null {
  const step = 20 * 60_000;
  let prev = from;
  let prevV = norm(fn(prev) - target + 180) - 180;
  for (let i = 1; i <= 2 * 72 + 30; i++) {
    const next = new Date(from.getTime() + i * step);
    const v = norm(fn(next) - target + 180) - 180;
    if (prevV < 0 && v >= 0) {
      let lo = prev.getTime();
      let hi = next.getTime();
      for (let k = 0; k < 20; k++) {
        const mid = (lo + hi) / 2;
        if (norm(fn(new Date(mid)) - target + 180) - 180 < 0) lo = mid;
        else hi = mid;
      }
      return new Date(hi);
    }
    prev = next;
    prevV = v;
  }
  return null;
}

/** RAHU KAAL eighth of the day by weekday (Sunday = 0). */
const RAHU_KAAL_PART = [8, 2, 7, 5, 6, 4, 3];

/** Panchang for a local calendar date at a place (values taken at sunrise). */
export function computePanchang(
  place: { lat: number; lon: number; tzMinutes: number },
  localDate: { year: number; month: number; day: number },
): Panchang {
  const midnightUtc = new Date(
    Date.UTC(localDate.year, localDate.month - 1, localDate.day) - place.tzMinutes * 60_000,
  );
  const observer = new A.Observer(place.lat, place.lon, 0);
  const rise = A.SearchRiseSet(A.Body.Sun, observer, +1, A.MakeTime(midnightUtc), 1);
  const set = A.SearchRiseSet(A.Body.Sun, observer, -1, A.MakeTime(midnightUtc), 1);
  const at = rise?.date ?? new Date(midnightUtc.getTime() + 6 * 3_600_000);

  const e = elongation(at);
  const tithiIndex = Math.floor(e / 12); // 0..29
  const paksha = tithiIndex < 15 ? "Shukla" : "Krishna";
  const inPaksha = tithiIndex % 15;
  const tithiName =
    inPaksha === 14 ? (paksha === "Shukla" ? "Purnima" : "Amavasya") : TITHIS[inPaksha]!;
  const tithiEnds = findCrossing(elongation, at, ((tithiIndex + 1) * 12) % 360);

  const moonLon = siderealLongitude("Moon", at);
  const sunLon = siderealLongitude("Sun", at);
  const nak = nakshatraOf(moonLon);
  const nakEnds = findCrossing(
    (d) => siderealLongitude("Moon", d),
    at,
    ((nak + 1) * NAK_SPAN) % 360,
  );
  const yoga = YOGAS[Math.floor(norm(moonLon + sunLon) / NAK_SPAN)]!;
  const k = Math.floor(e / 6); // 0..59
  const karana =
    k === 0
      ? "Kimstughna"
      : k >= 57
        ? (["Shakuni", "Chatushpada", "Naga"] as const)[k - 57]!
        : KARANAS_MOVABLE[(k - 1) % 7]!;

  // Weekday of the local date.
  const weekday = new Date(
    Date.UTC(localDate.year, localDate.month - 1, localDate.day),
  ).getUTCDay();
  let rahuKaal: Panchang["rahuKaal"] = null;
  if (rise && set) {
    const part = (set.date.getTime() - rise.date.getTime()) / 8;
    const startMs = rise.date.getTime() + (RAHU_KAAL_PART[weekday]! - 1) * part;
    rahuKaal = {
      start: new Date(startMs).toISOString(),
      end: new Date(startMs + part).toISOString(),
    };
  }

  return {
    date: `${localDate.year}-${String(localDate.month).padStart(2, "0")}-${String(localDate.day).padStart(2, "0")}`,
    sunrise: rise?.date.toISOString() ?? null,
    sunset: set?.date.toISOString() ?? null,
    vara: VARAS[weekday]!,
    tithi: {
      name: tithiName,
      paksha,
      number: inPaksha + 1,
      endsAt: tithiEnds?.toISOString() ?? null,
    },
    nakshatra: { name: NAKSHATRAS[nak]!, endsAt: nakEnds?.toISOString() ?? null },
    yoga,
    karana,
    moonRashi: rashiOf(moonLon),
    sunRashi: rashiOf(sunLon),
    rahuKaal,
  };
}

/** Today's Moon sign (used to ground the daily horoscope). */
export function moonRashiAt(date: Date): number {
  return rashiOf(siderealLongitude("Moon", date));
}

export function rashiName(i: number) {
  return RASHIS[((i % 12) + 12) % 12]!;
}

/** When Saturn, Jupiter and Rahu change sign over the coming years (sidereal). */
export function upcomingTransits(
  from: Date,
  years = 3,
): { planet: "Saturn" | "Jupiter" | "Rahu"; rashi: number; date: string }[] {
  const out: { planet: "Saturn" | "Jupiter" | "Rahu"; rashi: number; date: string }[] = [];
  const end = from.getTime() + years * YEAR_MS;
  const lon = (p: "Saturn" | "Jupiter" | "Rahu", d: Date) =>
    p === "Rahu" ? rahuLongitude(d) : siderealLongitude(p, d);
  for (const planet of ["Saturn", "Jupiter", "Rahu"] as const) {
    let prev = rashiOf(lon(planet, from));
    for (let t = from.getTime() + 2 * DAY_MS; t <= end; t += 2 * DAY_MS) {
      const r = rashiOf(lon(planet, new Date(t)));
      if (r !== prev) {
        out.push({ planet, rashi: r, date: new Date(t).toISOString().slice(0, 10) });
        prev = r;
      }
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
