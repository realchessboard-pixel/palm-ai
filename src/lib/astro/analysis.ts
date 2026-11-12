import type { Chart, PlanetPosition } from "./chart";
import { NAKSHATRAS, RASHIS, type Graha } from "./constants";

/**
 * Classical chart analysis, calculated (never guessed by the AI): sign
 * strength, combustion, house lords, graha drishti, yogas and the Navamsa.
 * Whole-sign houses from the Lagna (or from the Moon when the birth time is
 * unknown), as in the rest of AstroVidya. Rules follow Parashari tradition
 * (BPHS / Phaladeepika) in their widely used simple forms.
 */

type Planet7 = Exclude<Graha, "Rahu" | "Ketu">;
const SEVEN: Planet7[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];

/** Exaltation sign (0 = Mesha); debilitation is the opposite sign. */
const EXALTED: Record<Planet7, number> = {
  Sun: 0,
  Moon: 1,
  Mars: 9,
  Mercury: 5,
  Jupiter: 3,
  Venus: 11,
  Saturn: 6,
};
const OWN: Record<Planet7, number[]> = {
  Sun: [4],
  Moon: [3],
  Mars: [0, 7],
  Mercury: [2, 5],
  Jupiter: [8, 11],
  Venus: [1, 6],
  Saturn: [9, 10],
};
/** Natural (naisargika) friendships. Anything not listed is neutral. */
const FRIENDS: Record<Planet7, Planet7[]> = {
  Sun: ["Moon", "Mars", "Jupiter"],
  Moon: ["Sun", "Mercury"],
  Mars: ["Sun", "Moon", "Jupiter"],
  Mercury: ["Sun", "Venus"],
  Jupiter: ["Sun", "Moon", "Mars"],
  Venus: ["Mercury", "Saturn"],
  Saturn: ["Mercury", "Venus"],
};
const ENEMIES: Record<Planet7, Planet7[]> = {
  Sun: ["Venus", "Saturn"],
  Moon: [],
  Mars: ["Mercury"],
  Mercury: ["Moon"],
  Jupiter: ["Mercury", "Venus"],
  Venus: ["Sun", "Moon"],
  Saturn: ["Sun", "Moon", "Mars"],
};
/** Combustion orbs from the Sun, in degrees (retrograde values in brackets in the texts). */
const COMBUST_ORB: Partial<Record<Planet7, number>> = {
  Moon: 12,
  Mars: 17,
  Mercury: 14,
  Jupiter: 11,
  Venus: 10,
  Saturn: 15,
};
const COMBUST_ORB_RETRO: Partial<Record<Planet7, number>> = { Mercury: 12, Venus: 8 };
/** Special aspects, counted inclusively from the planet's own house (all planets aspect the 7th). */
const SPECIAL_ASPECTS: Partial<Record<Graha, number[]>> = {
  Mars: [4, 8],
  Jupiter: [5, 9],
  Saturn: [3, 10],
};

export type Dignity =
  "exalted" | "debilitated" | "own sign" | "friend's sign" | "neutral sign" | "enemy's sign";

export interface PlanetAnalysis {
  graha: Graha;
  rashi: number;
  degreeInSign: number;
  nakshatra: number;
  pada: number;
  nakshatraLord: Graha;
  house: number;
  retrograde: boolean;
  dignity: Dignity | null;
  combust: boolean;
  navamsa: number;
  vargottama: boolean;
  /** Houses this planet aspects (graha drishti). */
  aspects: number[];
  /** Houses this planet rules. */
  rules: number[];
}

export interface HouseAnalysis {
  house: number;
  rashi: number;
  lord: Planet7;
  lordHouse: number;
  occupants: Graha[];
  aspectedBy: Graha[];
}

export interface Yoga {
  name: string;
  /** Plain-language meaning, phrased as tradition. */
  meaning: string;
  /** The placements that form it. */
  basis: string;
}

export interface ChartAnalysis {
  /** Houses are counted from here: the Lagna, or the Moon when the time is unknown. */
  reference: "Lagna" | "Moon";
  ascendantRashi: number;
  navamsaLagna: number | null;
  planets: PlanetAnalysis[];
  houses: HouseAnalysis[];
  yogas: Yoga[];
}

const DASHA_ORDER: Graha[] = [
  "Ketu",
  "Venus",
  "Sun",
  "Moon",
  "Mars",
  "Rahu",
  "Jupiter",
  "Saturn",
  "Mercury",
];
export const nakshatraLord = (nakshatra: number): Graha => DASHA_ORDER[nakshatra % 9]!;

export const signLord = (rashi: number): Planet7 => RASHIS[rashi]!.lord as Planet7;

/** Navamsa (D9) sign of a sidereal longitude. */
export const navamsaOf = (longitude: number): number =>
  Math.floor((((longitude % 360) + 360) % 360) / (30 / 9)) % 12;

const houseFrom = (rashi: number, from: number) => ((rashi - from + 12) % 12) + 1;
const nthHouse = (house: number, n: number) => ((house - 1 + n - 1) % 12) + 1;

export function dignityOf(graha: Graha, rashi: number): Dignity | null {
  if (graha === "Rahu" || graha === "Ketu") return null;
  if (EXALTED[graha] === rashi) return "exalted";
  if ((EXALTED[graha] + 6) % 12 === rashi) return "debilitated";
  if (OWN[graha].includes(rashi)) return "own sign";
  const lord = signLord(rashi);
  if (FRIENDS[graha].includes(lord)) return "friend's sign";
  if (ENEMIES[graha].includes(lord)) return "enemy's sign";
  return "neutral sign";
}

function separation(a: number, b: number): number {
  const d = Math.abs((((a - b) % 360) + 360) % 360);
  return Math.min(d, 360 - d);
}

export function analyzeChart(chart: Chart, timeKnown: boolean): ChartAnalysis {
  const asc = timeKnown ? chart.lagna.rashi : chart.moon.rashi;
  const sun = chart.planets.find((p) => p.graha === "Sun")!;

  const rulesOf = (graha: Graha) =>
    graha === "Rahu" || graha === "Ketu"
      ? []
      : OWN[graha].map((r) => houseFrom(r, asc)).sort((a, b) => a - b);

  const planets: PlanetAnalysis[] = chart.planets.map((p: PlanetPosition) => {
    const house = houseFrom(p.rashi, asc);
    const nav = navamsaOf(p.longitude);
    let combust = false;
    if (p.graha !== "Sun" && p.graha !== "Rahu" && p.graha !== "Ketu") {
      const orb = (p.retrograde ? COMBUST_ORB_RETRO[p.graha] : undefined) ?? COMBUST_ORB[p.graha];
      combust = orb !== undefined && separation(p.longitude, sun.longitude) <= orb;
    }
    const aspects = [7, ...(SPECIAL_ASPECTS[p.graha] ?? [])]
      .map((n) => nthHouse(house, n))
      .sort((a, b) => a - b);
    return {
      graha: p.graha,
      rashi: p.rashi,
      degreeInSign: p.degreeInSign,
      nakshatra: p.nakshatra,
      pada: p.pada,
      nakshatraLord: nakshatraLord(p.nakshatra),
      house,
      retrograde: p.retrograde && p.graha !== "Rahu" && p.graha !== "Ketu",
      dignity: dignityOf(p.graha, p.rashi),
      combust,
      navamsa: nav,
      vargottama: nav === p.rashi,
      aspects,
      rules: rulesOf(p.graha),
    };
  });

  const byGraha = (g: Graha) => planets.find((p) => p.graha === g)!;
  const houses: HouseAnalysis[] = Array.from({ length: 12 }, (_, i) => {
    const house = i + 1;
    const rashi = (asc + i) % 12;
    const lord = signLord(rashi);
    return {
      house,
      rashi,
      lord,
      lordHouse: byGraha(lord).house,
      occupants: planets.filter((p) => p.house === house).map((p) => p.graha),
      aspectedBy: planets.filter((p) => p.aspects.includes(house)).map((p) => p.graha),
    };
  });

  return {
    reference: timeKnown ? "Lagna" : "Moon",
    ascendantRashi: asc,
    navamsaLagna: timeKnown ? navamsaOf(chart.lagna.longitude) : null,
    planets,
    houses,
    yogas: findYogas(planets, houses, chart, timeKnown),
  };
}

const KENDRA = [1, 4, 7, 10];
const MAHAPURUSHA: Partial<Record<Planet7, [string, string]>> = {
  Mars: ["Ruchaka Yoga", "courage, drive and leadership"],
  Mercury: ["Bhadra Yoga", "intelligence, speech and skill with learning or trade"],
  Jupiter: ["Hamsa Yoga", "wisdom, good conduct and respect from others"],
  Venus: ["Malavya Yoga", "grace, comfort, the arts and a pleasant married life"],
  Saturn: ["Shasha Yoga", "discipline, endurance and authority earned over time"],
};

/**
 * Supportive yogas only: AstroVidya never frightens anyone with "bad" yogas or
 * doshas. Each is reported with the placements that form it.
 */
function findYogas(
  planets: PlanetAnalysis[],
  houses: HouseAnalysis[],
  chart: Chart,
  timeKnown: boolean,
): Yoga[] {
  const yogas: Yoga[] = [];
  const p = (g: Graha) => planets.find((x) => x.graha === g)!;
  const sign = (g: Graha) => RASHIS[p(g).rashi]!.name;
  const sameSign = (a: Graha, b: Graha) => p(a).rashi === p(b).rashi;

  // Gaja Kesari: Jupiter in a kendra from the Moon.
  const jupFromMoon = houseFrom(p("Jupiter").rashi, chart.moon.rashi);
  if (KENDRA.includes(jupFromMoon)) {
    yogas.push({
      name: "Gaja Kesari Yoga",
      meaning: "traditionally linked with wisdom, good name and support from others",
      basis: `Jupiter in the ${ordinal(jupFromMoon)} house from the Moon (${sign("Jupiter")})`,
    });
  }
  // Budhaditya: Sun and Mercury together, Mercury not combust.
  if (sameSign("Sun", "Mercury") && !p("Mercury").combust) {
    yogas.push({
      name: "Budhaditya Yoga",
      meaning: "traditionally linked with a sharp intellect and clear communication",
      basis: `Sun and Mercury together in ${sign("Sun")}`,
    });
  }
  // Chandra-Mangala: Moon and Mars together.
  if (sameSign("Moon", "Mars")) {
    yogas.push({
      name: "Chandra-Mangala Yoga",
      meaning: "traditionally linked with enterprise and the drive to earn",
      basis: `Moon and Mars together in ${sign("Moon")}`,
    });
  }
  // Pancha Mahapurusha: Mars/Mercury/Jupiter/Venus/Saturn in own or exaltation sign, in a kendra.
  if (timeKnown) {
    for (const [graha, [name, meaning]] of Object.entries(MAHAPURUSHA) as [
      Planet7,
      [string, string],
    ][]) {
      const x = p(graha);
      if ((x.dignity === "own sign" || x.dignity === "exalted") && KENDRA.includes(x.house)) {
        yogas.push({
          name,
          meaning: `traditionally linked with ${meaning}`,
          basis: `${graha} ${x.dignity === "exalted" ? "exalted" : "in its own sign"} (${sign(graha)}) in the ${ordinal(x.house)} house`,
        });
      }
    }
  }
  if (timeKnown) {
    // Raja Yoga: a kendra lord joins a trikona lord (different planets).
    const lordsOf = (hs: number[]) => new Set(hs.map((h) => houses[h - 1]!.lord));
    const kendraLords = lordsOf([4, 7, 10]);
    const trikonaLords = lordsOf([5, 9]);
    const seen = new Set<string>();
    for (const k of kendraLords) {
      for (const t of trikonaLords) {
        if (k === t || !sameSign(k, t)) continue;
        const key = [k, t].sort().join("+");
        if (seen.has(key)) continue;
        seen.add(key);
        yogas.push({
          name: "Raja Yoga",
          meaning: "traditionally linked with rising status and recognition through effort",
          basis: `${k} (lord of the ${list(p(k).rules)}) with ${t} (lord of the ${list(p(t).rules)}) in ${sign(k)}`,
        });
      }
    }
    // Yoga-karaka: one planet ruling both a kendra (4/7/10) and a trikona (5/9).
    for (const x of planets) {
      if (x.rules.some((h) => [4, 7, 10].includes(h)) && x.rules.some((h) => [5, 9].includes(h))) {
        yogas.push({
          name: "Yoga-karaka planet",
          meaning: `${x.graha} is especially supportive in this chart`,
          basis: `${x.graha} rules the ${list(x.rules)} houses`,
        });
      }
    }
    // Dhana Yoga: a lord of 2 or 11 joins a lord of 5 or 9.
    const wealth = lordsOf([2, 11]);
    const fortune = lordsOf([5, 9]);
    const seenD = new Set<string>();
    for (const w of wealth) {
      for (const f of fortune) {
        if (w === f || !sameSign(w, f)) continue;
        const key = [w, f].sort().join("+");
        if (seenD.has(key)) continue;
        seenD.add(key);
        yogas.push({
          name: "Dhana Yoga",
          meaning: "traditionally linked with earning and building savings",
          basis: `${w} (lord of the ${list(p(w).rules)}) with ${f} (lord of the ${list(p(f).rules)}) in ${sign(w)}`,
        });
      }
    }
  }
  // Parivartana: two planets in each other's signs.
  for (let i = 0; i < SEVEN.length; i++) {
    for (let j = i + 1; j < SEVEN.length; j++) {
      const a = SEVEN[i]!;
      const b = SEVEN[j]!;
      if (OWN[a].includes(p(b).rashi) && OWN[b].includes(p(a).rashi)) {
        yogas.push({
          name: "Parivartana Yoga",
          meaning: `${a} and ${b} strengthen each other by exchanging signs`,
          basis: `${a} in ${sign(a)}, ${b} in ${sign(b)}`,
        });
      }
    }
  }
  return yogas;
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]!);
}

function list(houses: number[]): string {
  return houses.map(ordinal).join(" and ");
}

/** The analysis as plain lines for the AI, so every statement can cite a real placement. */
export function analysisFacts(a: ChartAnalysis): string[] {
  const lines: string[] = [];
  lines.push(`Houses are counted from the ${a.reference} (whole-sign houses).`);
  for (const x of a.planets) {
    const bits = [
      `${x.graha} at ${x.degreeInSign.toFixed(1)}° ${RASHIS[x.rashi]!.name}`,
      `house ${x.house}`,
      `${NAKSHATRAS[x.nakshatra]} pada ${x.pada} (nakshatra lord ${x.nakshatraLord})`,
    ];
    if (x.dignity) bits.push(x.dignity);
    if (x.retrograde) bits.push("retrograde");
    if (x.combust) bits.push("combust (close to the Sun)");
    if (x.vargottama) bits.push("vargottama");
    if (x.rules.length) bits.push(`rules house ${x.rules.join(" & ")}`);
    bits.push(`aspects house ${x.aspects.join(", ")}`);
    lines.push(bits.join("; "));
  }
  for (const h of a.houses) {
    lines.push(
      `House ${h.house} (${RASHIS[h.rashi]!.name}): lord ${h.lord} in house ${h.lordHouse}` +
        (h.occupants.length ? `; occupied by ${h.occupants.join(", ")}` : "") +
        (h.aspectedBy.length ? `; aspected by ${h.aspectedBy.join(", ")}` : ""),
    );
  }
  if (a.navamsaLagna !== null) lines.push(`Navamsa (D9) Lagna: ${RASHIS[a.navamsaLagna]!.name}`);
  lines.push(
    `Navamsa (D9) positions: ${a.planets.map((x) => `${x.graha} ${RASHIS[x.navamsa]!.name}`).join(", ")}`,
  );
  lines.push(
    a.yogas.length
      ? `Yogas: ${a.yogas.map((y) => `${y.name} (${y.basis})`).join("; ")}`
      : "Yogas: none of the classic supportive yogas checked here",
  );
  return lines;
}
