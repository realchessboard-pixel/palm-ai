import { describe, expect, it } from "vitest";
import {
  analysisFacts,
  analyzeChart,
  dignityOf,
  nakshatraLord,
  navamsaOf,
} from "@/lib/astro/analysis";
import type { Chart, PlanetPosition } from "@/lib/astro/chart";
import { computeChart } from "@/lib/astro/chart";
import type { Graha } from "@/lib/astro/constants";

/** A hand-built chart: longitudes in sidereal degrees, Lagna in Mesha (0°–30°). */
function chartWith(longitudes: Partial<Record<Graha, number>>, lagna = 10): Chart {
  const all: Record<Graha, number> = {
    Sun: 100,
    Moon: 200,
    Mars: 40,
    Mercury: 110,
    Jupiter: 250,
    Venus: 70,
    Saturn: 310,
    Rahu: 20,
    Ketu: 200,
    ...longitudes,
  };
  const planets: PlanetPosition[] = (Object.keys(all) as Graha[]).map((graha) => {
    const lon = all[graha];
    return {
      graha,
      longitude: lon,
      rashi: Math.floor(lon / 30),
      degreeInSign: lon % 30,
      nakshatra: Math.floor(lon / (360 / 27)),
      pada: 1,
      house: ((Math.floor(lon / 30) - Math.floor(lagna / 30) + 12) % 12) + 1,
      retrograde: false,
    };
  });
  const moon = planets.find((p) => p.graha === "Moon")!;
  return {
    utc: "2000-01-01T00:00:00Z",
    lagna: {
      longitude: lagna,
      rashi: Math.floor(lagna / 30),
      degreeInSign: lagna % 30,
      nakshatra: 0,
    },
    planets,
    moon: { rashi: moon.rashi, nakshatra: moon.nakshatra, pada: 1, longitude: moon.longitude },
    sunRashi: Math.floor(all.Sun / 30),
    dasha: [],
  };
}

describe("chart analysis (calculated, not AI)", () => {
  it("knows exaltation, debilitation, own signs and natural friendship", () => {
    expect(dignityOf("Sun", 0)).toBe("exalted"); // Mesha
    expect(dignityOf("Sun", 6)).toBe("debilitated"); // Tula
    expect(dignityOf("Saturn", 6)).toBe("exalted");
    expect(dignityOf("Jupiter", 9)).toBe("debilitated"); // Makara
    expect(dignityOf("Venus", 1)).toBe("own sign"); // Vrishabha
    expect(dignityOf("Mars", 8)).toBe("friend's sign"); // Dhanu, Jupiter's sign
    expect(dignityOf("Sun", 10)).toBe("enemy's sign"); // Kumbha, Saturn's sign
    expect(dignityOf("Rahu", 0)).toBeNull();
  });

  it("uses the Vimshottari order for nakshatra lords", () => {
    expect(nakshatraLord(0)).toBe("Ketu"); // Ashwini
    expect(nakshatraLord(3)).toBe("Moon"); // Rohini
    expect(nakshatraLord(26)).toBe("Mercury"); // Revati
  });

  it("puts Navamsa boundaries in the right signs", () => {
    expect(navamsaOf(0)).toBe(0); // 0° Mesha → Mesha
    expect(navamsaOf(3.4)).toBe(1); // second pada of Mesha → Vrishabha
    expect(navamsaOf(30)).toBe(9); // 0° Vrishabha → Makara
    expect(navamsaOf(60)).toBe(6); // 0° Mithuna → Tula
    expect(navamsaOf(90)).toBe(3); // 0° Karka → Karka (vargottama zone)
  });

  it("finds combustion, aspects and house lords", () => {
    const a = analyzeChart(chartWith({ Sun: 100, Mercury: 105, Venus: 130 }), true);
    const merc = a.planets.find((p) => p.graha === "Mercury")!;
    expect(merc.combust).toBe(true); // 5° from the Sun
    expect(a.planets.find((p) => p.graha === "Venus")!.combust).toBe(false); // 30° away
    const mars = a.planets.find((p) => p.graha === "Mars")!; // Vrishabha → house 2
    expect(mars.house).toBe(2);
    expect(mars.aspects).toEqual([5, 8, 9]); // 4th, 7th, 8th from the 2nd
    expect(mars.rules).toEqual([1, 8]); // Mesha & Vrishchika from a Mesha Lagna
    expect(a.houses[0]).toMatchObject({ house: 1, lord: "Mars", lordHouse: 2 });
  });

  it("spots Gaja Kesari, Hamsa and a Raja Yoga, and gives their basis", () => {
    // Moon in Karka, Jupiter in Karka (same sign = kendra 1 from Moon) and exalted in house 4.
    // Mesha Lagna: Saturn rules 10, Jupiter rules 9 — together in Karka = Raja Yoga.
    const a = analyzeChart(chartWith({ Moon: 95, Jupiter: 100, Saturn: 105, Sun: 160 }), true);
    const names = a.yogas.map((y) => y.name);
    expect(names).toContain("Gaja Kesari Yoga");
    expect(names).toContain("Hamsa Yoga");
    expect(names).toContain("Raja Yoga");
    expect(a.yogas.find((y) => y.name === "Raja Yoga")!.basis).toMatch(/Jupiter|Saturn/);
  });

  it("counts houses from the Moon when the birth time is unknown", () => {
    const a = analyzeChart(chartWith({ Moon: 95 }), false);
    expect(a.reference).toBe("Moon");
    expect(a.ascendantRashi).toBe(3);
    expect(a.navamsaLagna).toBeNull();
    expect(a.yogas.map((y) => y.name)).not.toContain("Raja Yoga"); // needs a known Lagna
  });

  it("produces citeable facts for a real chart", () => {
    const chart = computeChart({
      year: 1994,
      month: 6,
      day: 21,
      hour: 7,
      minute: 45,
      lat: 19.076,
      lon: 72.8777,
      tzMinutes: 330,
    });
    const facts = analysisFacts(analyzeChart(chart, true)).join("\n");
    expect(facts).toMatch(/House 10 \(\w+\): lord \w+ in house \d+/);
    expect(facts).toMatch(/Navamsa \(D9\) Lagna: \w+/);
    expect(facts).toMatch(/nakshatra lord/);
  });
});
