/** Names used across the astrology features (sidereal / Vedic, Lahiri ayanamsa). */

export const RASHIS = [
  { name: "Mesha", english: "Aries", hindi: "मेष", lord: "Mars" },
  { name: "Vrishabha", english: "Taurus", hindi: "वृषभ", lord: "Venus" },
  { name: "Mithuna", english: "Gemini", hindi: "मिथुन", lord: "Mercury" },
  { name: "Karka", english: "Cancer", hindi: "कर्क", lord: "Moon" },
  { name: "Simha", english: "Leo", hindi: "सिंह", lord: "Sun" },
  { name: "Kanya", english: "Virgo", hindi: "कन्या", lord: "Mercury" },
  { name: "Tula", english: "Libra", hindi: "तुला", lord: "Venus" },
  { name: "Vrishchika", english: "Scorpio", hindi: "वृश्चिक", lord: "Mars" },
  { name: "Dhanu", english: "Sagittarius", hindi: "धनु", lord: "Jupiter" },
  { name: "Makara", english: "Capricorn", hindi: "मकर", lord: "Saturn" },
  { name: "Kumbha", english: "Aquarius", hindi: "कुंभ", lord: "Saturn" },
  { name: "Meena", english: "Pisces", hindi: "मीन", lord: "Jupiter" },
] as const;

export const SIGN_SLUGS = RASHIS.map((r) => r.english.toLowerCase());

export const NAKSHATRAS = [
  "Ashwini",
  "Bharani",
  "Krittika",
  "Rohini",
  "Mrigashira",
  "Ardra",
  "Punarvasu",
  "Pushya",
  "Ashlesha",
  "Magha",
  "Purva Phalguni",
  "Uttara Phalguni",
  "Hasta",
  "Chitra",
  "Swati",
  "Vishakha",
  "Anuradha",
  "Jyeshtha",
  "Mula",
  "Purva Ashadha",
  "Uttara Ashadha",
  "Shravana",
  "Dhanishta",
  "Shatabhisha",
  "Purva Bhadrapada",
  "Uttara Bhadrapada",
  "Revati",
] as const;

export type Graha =
  "Sun" | "Moon" | "Mars" | "Mercury" | "Jupiter" | "Venus" | "Saturn" | "Rahu" | "Ketu";

export const GRAHA_NAMES: Record<Graha, { sanskrit: string; short: string }> = {
  Sun: { sanskrit: "Surya", short: "Su" },
  Moon: { sanskrit: "Chandra", short: "Mo" },
  Mars: { sanskrit: "Mangal", short: "Ma" },
  Mercury: { sanskrit: "Budh", short: "Me" },
  Jupiter: { sanskrit: "Guru", short: "Ju" },
  Venus: { sanskrit: "Shukra", short: "Ve" },
  Saturn: { sanskrit: "Shani", short: "Sa" },
  Rahu: { sanskrit: "Rahu", short: "Ra" },
  Ketu: { sanskrit: "Ketu", short: "Ke" },
};

/** Vimshottari dasha order and years (120-year cycle). */
export const DASHA_ORDER: { lord: Graha; years: number }[] = [
  { lord: "Ketu", years: 7 },
  { lord: "Venus", years: 20 },
  { lord: "Sun", years: 6 },
  { lord: "Moon", years: 10 },
  { lord: "Mars", years: 7 },
  { lord: "Rahu", years: 18 },
  { lord: "Jupiter", years: 16 },
  { lord: "Saturn", years: 19 },
  { lord: "Mercury", years: 17 },
];

export const TITHIS = [
  "Pratipada",
  "Dwitiya",
  "Tritiya",
  "Chaturthi",
  "Panchami",
  "Shashthi",
  "Saptami",
  "Ashtami",
  "Navami",
  "Dashami",
  "Ekadashi",
  "Dwadashi",
  "Trayodashi",
  "Chaturdashi",
] as const;

export const YOGAS = [
  "Vishkambha",
  "Priti",
  "Ayushman",
  "Saubhagya",
  "Shobhana",
  "Atiganda",
  "Sukarma",
  "Dhriti",
  "Shula",
  "Ganda",
  "Vriddhi",
  "Dhruva",
  "Vyaghata",
  "Harshana",
  "Vajra",
  "Siddhi",
  "Vyatipata",
  "Variyana",
  "Parigha",
  "Shiva",
  "Siddha",
  "Sadhya",
  "Shubha",
  "Shukla",
  "Brahma",
  "Indra",
  "Vaidhriti",
] as const;

export const KARANAS_MOVABLE = [
  "Bava",
  "Balava",
  "Kaulava",
  "Taitila",
  "Garaja",
  "Vanija",
  "Vishti",
] as const;

export const VARAS = [
  { name: "Ravivara", english: "Sunday" },
  { name: "Somavara", english: "Monday" },
  { name: "Mangalavara", english: "Tuesday" },
  { name: "Budhavara", english: "Wednesday" },
  { name: "Guruvara", english: "Thursday" },
  { name: "Shukravara", english: "Friday" },
  { name: "Shanivara", english: "Saturday" },
] as const;
