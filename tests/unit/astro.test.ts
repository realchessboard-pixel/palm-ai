import { describe, expect, it } from "vitest";
import {
  ayanamsa,
  computeChart,
  computePanchang,
  currentDasha,
  localSiderealDegrees,
  norm,
  siderealLongitude,
  tropicalAscendant,
} from "@/lib/astro/chart";
import { NAKSHATRAS, RASHIS } from "@/lib/astro/constants";
import { gunaMilan, milanSummary } from "@/lib/astro/milan";
import { findPlace } from "@/lib/astro/places";

const delhi = findPlace("new-delhi")!;
const rad = (d: number) => (d * Math.PI) / 180;

describe("sidereal positions", () => {
  it("uses the Lahiri ayanamsa (≈23.85° at J2000, growing ~50″ a year)", () => {
    expect(ayanamsa(new Date(Date.UTC(2000, 0, 1, 12)))).toBeCloseTo(23.853, 2);
    expect(ayanamsa(new Date(Date.UTC(2026, 0, 1)))).toBeCloseTo(24.216, 1);
  });

  it("puts the Sun in Dhanu at the start of January", () => {
    const sun = siderealLongitude("Sun", new Date(Date.UTC(2000, 0, 1, 12)));
    expect(sun).toBeCloseTo(256.52, 1);
    expect(RASHIS[Math.floor(sun / 30)]!.name).toBe("Dhanu");
  });

  it("finds an ascendant that is really rising on the eastern horizon", () => {
    for (const [date, lat, lon] of [
      [new Date(Date.UTC(1990, 5, 15, 3, 30)), 28.61, 77.21],
      [new Date(Date.UTC(2001, 10, 2, 18, 5)), 13.08, 80.27],
      [new Date(Date.UTC(2015, 1, 20, 9, 45)), 19.08, 72.88],
    ] as const) {
      const L = rad(tropicalAscendant(date, lat, lon));
      const eps = rad(23.4365);
      const ra = Math.atan2(Math.sin(L) * Math.cos(eps), Math.cos(L));
      const dec = Math.asin(Math.sin(eps) * Math.sin(L));
      const H = rad(localSiderealDegrees(date, lon)) - ra;
      const alt = Math.asin(
        Math.sin(rad(lat)) * Math.sin(dec) + Math.cos(rad(lat)) * Math.cos(dec) * Math.cos(H),
      );
      expect(Math.abs((alt * 180) / Math.PI)).toBeLessThan(0.05);
      expect(Math.sin(H)).toBeLessThan(0); // east of the meridian: rising, not setting
    }
  });

  it("builds a whole chart: nine grahas, houses from the lagna, Rahu opposite Ketu", () => {
    const chart = computeChart({
      year: 1995,
      month: 8,
      day: 15,
      hour: 10,
      minute: 30,
      lat: delhi.lat,
      lon: delhi.lon,
      tzMinutes: 330,
    });
    expect(chart.planets).toHaveLength(9);
    const rahu = chart.planets.find((p) => p.graha === "Rahu")!;
    const ketu = chart.planets.find((p) => p.graha === "Ketu")!;
    expect(norm(ketu.longitude - rahu.longitude)).toBeCloseTo(180, 5);
    for (const p of chart.planets) {
      expect(p.house).toBe(((p.rashi - chart.lagna.rashi + 12) % 12) + 1);
      expect(p.nakshatra).toBeLessThan(27);
    }
    expect(chart.planets.find((p) => p.graha === "Sun")!.retrograde).toBe(false);
    expect(NAKSHATRAS[chart.moon.nakshatra]).toBeTruthy();
  });

  it("lays out Vimshottari dashas over 120 years, with antardashas filling each", () => {
    const chart = computeChart({
      year: 1988,
      month: 3,
      day: 2,
      hour: 6,
      minute: 0,
      lat: 12.97,
      lon: 77.59,
      tzMinutes: 330,
    });
    const first = new Date(chart.dasha[0]!.start).getTime();
    const last = new Date(chart.dasha.at(-1)!.end).getTime();
    expect((last - first) / (365.25 * 86_400_000)).toBeCloseTo(120, 3);
    for (const d of chart.dasha) {
      expect(d.antar[0]!.start).toBe(d.start);
      expect(
        Math.abs(new Date(d.antar.at(-1)!.end).getTime() - new Date(d.end).getTime()),
      ).toBeLessThan(5);
    }
    expect(new Date(chart.dasha[0]!.start).getTime()).toBeLessThanOrEqual(
      new Date(chart.utc).getTime(),
    );
    expect(currentDasha(chart.dasha, new Date(Date.UTC(2026, 0, 1))).maha).not.toBeNull();
  });
});

describe("panchang", () => {
  it("matches known dates: Diwali 2025 is Amavasya, Kartik Purnima 2025 is Purnima", () => {
    const diwali = computePanchang(delhi, { year: 2025, month: 10, day: 21 });
    expect(diwali.tithi).toMatchObject({ name: "Amavasya", paksha: "Krishna" });
    const purnima = computePanchang(delhi, { year: 2025, month: 11, day: 5 });
    expect(purnima.tithi).toMatchObject({ name: "Purnima", paksha: "Shukla" });
    expect(purnima.vara.english).toBe("Wednesday");
  });

  it("gives sunrise around 6 a.m. IST in Delhi and a Rahu Kaal within the day", () => {
    const p = computePanchang(delhi, { year: 2026, month: 10, day: 5 });
    const sunriseIst = new Date(new Date(p.sunrise!).getTime() + 330 * 60_000);
    expect(sunriseIst.getUTCHours()).toBe(6);
    expect(p.rahuKaal!.start > p.sunrise! && p.rahuKaal!.end < p.sunset!).toBe(true);
    expect(p.tithi.endsAt! > p.sunrise!).toBe(true);
  });
});

describe("Guna Milan", () => {
  it("scores the same Moon nakshatra as 28/36 (everything but Nadi)", () => {
    const r = gunaMilan({ rashi: 0, nakshatra: 0 }, { rashi: 0, nakshatra: 0 });
    expect(r.kootas.map((k) => k.score)).toEqual([1, 2, 3, 4, 5, 6, 7, 0]);
    expect(r.total).toBe(28);
    expect(r.kootas.reduce((n, k) => n + k.max, 0)).toBe(36);
  });

  it("applies Bhakoot and Nadi rules", () => {
    // Aries (Ashwini, Adi) with Taurus (Rohini, Antya): 2/12 Bhakoot → 0; different Nadi → 8.
    const r = gunaMilan({ rashi: 0, nakshatra: 0 }, { rashi: 1, nakshatra: 3 });
    expect(r.kootas.find((k) => k.id === "bhakoot")!.score).toBe(0);
    expect(r.kootas.find((k) => k.id === "nadi")!.score).toBe(8);
    expect(r.total).toBeGreaterThanOrEqual(0);
    expect(r.total).toBeLessThanOrEqual(36);
  });

  it("describes scores gently, without verdicts", () => {
    expect(milanSummary(10)).toMatch(/doesn't decide a relationship/);
    expect(milanSummary(30)).toMatch(/harmonious/);
  });
});
