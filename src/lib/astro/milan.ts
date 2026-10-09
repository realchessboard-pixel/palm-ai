import { msg } from "@/lib/i18n/msg";
import { NAKSHATRAS, RASHIS } from "./constants";

/**
 * Ashtakoota Guna Milan (36 points) from the two Moon positions. This follows
 * a common North Indian method. Traditions differ in some tables, so the page
 * says so; and it is presented as one traditional lens, never as a verdict on
 * a relationship.
 */
export interface Koota {
  id: "varna" | "vashya" | "tara" | "yoni" | "maitri" | "gana" | "bhakoot" | "nadi";
  name: string;
  max: number;
  score: number;
  /** What each person has for this koota. */
  a: string;
  b: string;
  meaning: string;
}

export interface MilanResult {
  total: number;
  max: 36;
  kootas: Koota[];
}

const VARNA = ["Kshatriya", "Vaishya", "Shudra", "Brahmin"]; // by rashi % 4 (Aries…)
const VARNA_RANK: Record<string, number> = { Brahmin: 4, Kshatriya: 3, Vaishya: 2, Shudra: 1 };

/** Classical vashya list: rashis each rashi holds "under its influence". */
const VASHYA: number[][] = [
  [4, 7], // Aries → Leo, Scorpio
  [3, 6], // Taurus → Cancer, Libra
  [5], // Gemini → Virgo
  [7, 8], // Cancer → Scorpio, Sagittarius
  [6], // Leo → Libra
  [11, 2], // Virgo → Pisces, Gemini
  [9, 5], // Libra → Capricorn, Virgo
  [3], // Scorpio → Cancer
  [11], // Sagittarius → Pisces
  [0, 10], // Capricorn → Aries, Aquarius
  [0], // Aquarius → Aries
  [9], // Pisces → Capricorn
];

const YONI = [
  "Horse",
  "Elephant",
  "Sheep",
  "Serpent",
  "Serpent",
  "Dog",
  "Cat",
  "Sheep",
  "Cat",
  "Rat",
  "Rat",
  "Cow",
  "Buffalo",
  "Tiger",
  "Buffalo",
  "Tiger",
  "Deer",
  "Deer",
  "Dog",
  "Monkey",
  "Mongoose",
  "Monkey",
  "Lion",
  "Horse",
  "Lion",
  "Cow",
  "Elephant",
];
const YONI_ENEMIES: [string, string][] = [
  ["Horse", "Buffalo"],
  ["Elephant", "Lion"],
  ["Sheep", "Monkey"],
  ["Serpent", "Mongoose"],
  ["Dog", "Deer"],
  ["Cat", "Rat"],
  ["Cow", "Tiger"],
];

type Planet = "Sun" | "Moon" | "Mars" | "Mercury" | "Jupiter" | "Venus" | "Saturn";
const FRIENDS: Record<Planet, { friends: Planet[]; enemies: Planet[] }> = {
  Sun: { friends: ["Moon", "Mars", "Jupiter"], enemies: ["Venus", "Saturn"] },
  Moon: { friends: ["Sun", "Mercury"], enemies: [] },
  Mars: { friends: ["Sun", "Moon", "Jupiter"], enemies: ["Mercury"] },
  Mercury: { friends: ["Sun", "Venus"], enemies: ["Moon"] },
  Jupiter: { friends: ["Sun", "Moon", "Mars"], enemies: ["Mercury", "Venus"] },
  Venus: { friends: ["Mercury", "Saturn"], enemies: ["Sun", "Moon"] },
  Saturn: { friends: ["Mercury", "Venus"], enemies: ["Sun", "Moon", "Mars"] },
};
const relation = (a: Planet, b: Planet) =>
  FRIENDS[a].friends.includes(b) ? "friend" : FRIENDS[a].enemies.includes(b) ? "enemy" : "neutral";

const GANA_OF = (n: number): "Deva" | "Manushya" | "Rakshasa" => {
  const deva = [0, 4, 6, 7, 12, 14, 16, 21, 26];
  const rakshasa = [2, 8, 9, 13, 15, 17, 18, 22, 23];
  return deva.includes(n) ? "Deva" : rakshasa.includes(n) ? "Rakshasa" : "Manushya";
};

const NADI = ["Adi", "Madhya", "Antya", "Antya", "Madhya", "Adi"];
const nadiOf = (n: number) => NADI[n % 6]!;

/**
 * `a` is traditionally the groom's Moon and `b` the bride's; for Varna and
 * Vashya the direction matters. Pass whichever applies.
 */
export function gunaMilan(
  a: { rashi: number; nakshatra: number },
  b: { rashi: number; nakshatra: number },
): MilanResult {
  const kootas: Koota[] = [];

  // 1. Varna
  const va = VARNA[a.rashi % 4]!;
  const vb = VARNA[b.rashi % 4]!;
  kootas.push({
    id: "varna",
    name: msg("Varna"),
    max: 1,
    score: VARNA_RANK[va]! >= VARNA_RANK[vb]! ? 1 : 0,
    a: va,
    b: vb,
    meaning: msg("Temperament and approach to work and duty."),
  });

  // 2. Vashya
  const mutual =
    a.rashi === b.rashi ||
    (VASHYA[a.rashi]!.includes(b.rashi) && VASHYA[b.rashi]!.includes(a.rashi));
  const oneWay = VASHYA[a.rashi]!.includes(b.rashi) || VASHYA[b.rashi]!.includes(a.rashi);
  kootas.push({
    id: "vashya",
    name: msg("Vashya"),
    max: 2,
    score: mutual ? 2 : oneWay ? 1 : 0,
    a: RASHIS[a.rashi]!.name,
    b: RASHIS[b.rashi]!.name,
    meaning: msg("Natural influence and attraction between the two."),
  });

  // 3. Tara
  const taraGood = (from: number, to: number) =>
    ![3, 5, 7].includes((((to - from + 27) % 27) + 1) % 9);
  const t1 = taraGood(b.nakshatra, a.nakshatra);
  const t2 = taraGood(a.nakshatra, b.nakshatra);
  kootas.push({
    id: "tara",
    name: msg("Tara"),
    max: 3,
    score: t1 && t2 ? 3 : t1 || t2 ? 1.5 : 0,
    a: NAKSHATRAS[a.nakshatra]!,
    b: NAKSHATRAS[b.nakshatra]!,
    meaning: msg("Harmony of the birth stars — wellbeing in each other's company."),
  });

  // 4. Yoni (simplified: same 4, natural enemies 0, otherwise 2)
  const ya = YONI[a.nakshatra]!;
  const yb = YONI[b.nakshatra]!;
  const enemies = YONI_ENEMIES.some(([x, y]) => (x === ya && y === yb) || (x === yb && y === ya));
  kootas.push({
    id: "yoni",
    name: msg("Yoni"),
    max: 4,
    score: ya === yb ? 4 : enemies ? 0 : 2,
    a: ya,
    b: yb,
    meaning: msg("Instinctive nature and physical comfort with each other."),
  });

  // 5. Graha Maitri
  const la = RASHIS[a.rashi]!.lord as Planet;
  const lb = RASHIS[b.rashi]!.lord as Planet;
  const r1 = relation(la, lb);
  const r2 = relation(lb, la);
  const pair = [r1, r2].sort().join("+");
  const maitri =
    la === lb
      ? 5
      : (
          {
            "friend+friend": 5,
            "friend+neutral": 4,
            "neutral+neutral": 3,
            "enemy+friend": 1,
            "enemy+neutral": 0.5,
            "enemy+enemy": 0,
          } as Record<string, number>
        )[pair]!;
  kootas.push({
    id: "maitri",
    name: msg("Graha Maitri"),
    max: 5,
    score: maitri,
    a: `${la} (lord of ${RASHIS[a.rashi]!.name})`,
    b: `${lb} (lord of ${RASHIS[b.rashi]!.name})`,
    meaning: msg("Mental wavelength and friendship between the two Moon-sign lords."),
  });

  // 6. Gana
  const ga = GANA_OF(a.nakshatra);
  const gb = GANA_OF(b.nakshatra);
  const ganaPair = [ga, gb].sort().join("+");
  const gana =
    ga === gb
      ? 6
      : (
          { "Deva+Manushya": 5, "Deva+Rakshasa": 1, "Manushya+Rakshasa": 0 } as Record<
            string,
            number
          >
        )[ganaPair]!;
  kootas.push({
    id: "gana",
    name: msg("Gana"),
    max: 6,
    score: gana,
    a: ga,
    b: gb,
    meaning: msg("Temperament: gentle, human or intense natures."),
  });

  // 7. Bhakoot
  const d1 = ((b.rashi - a.rashi + 12) % 12) + 1;
  const d2 = ((a.rashi - b.rashi + 12) % 12) + 1;
  const bad = [
    [2, 12],
    [5, 9],
    [6, 8],
  ].some(([x, y]) => (d1 === x && d2 === y) || (d1 === y && d2 === x));
  kootas.push({
    id: "bhakoot",
    name: msg("Bhakoot"),
    max: 7,
    score: bad ? 0 : 7,
    a: RASHIS[a.rashi]!.name,
    b: RASHIS[b.rashi]!.name,
    meaning: msg("How the two Moon signs sit together — shared direction in life."),
  });

  // 8. Nadi
  const na = nadiOf(a.nakshatra);
  const nb = nadiOf(b.nakshatra);
  kootas.push({
    id: "nadi",
    name: msg("Nadi"),
    max: 8,
    score: na === nb ? 0 : 8,
    a: na,
    b: nb,
    meaning: msg("Constitution and energy — traditionally the most weighted koota."),
  });

  return { total: kootas.reduce((n, k) => n + k.score, 0), max: 36, kootas };
}

/** A gentle, traditional description of a total score. No verdicts. */
export function milanSummary(total: number): string {
  if (total >= 28)
    return "Traditionally read as a very harmonious match of Moon signs and birth stars.";
  if (total >= 18)
    return "Traditionally considered a workable match — 18 or more of 36 is the usual threshold.";
  return "Below the traditional threshold of 18. Many families also look at the full charts, and Guna Milan is only one traditional lens — it doesn't decide a relationship.";
}
