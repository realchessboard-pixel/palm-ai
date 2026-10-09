import { LIFE_AREAS } from "@/lib/kundli/areas";
import generated from "./generated.json";
import type { Language } from "./languages";

/**
 * Site text (navigation, home page, Mahakundli, Milan, rashifal, payments).
 * English is written here; other languages are translated once and committed
 * in generated.json (scripts/translate-ui.mjs), so showing them costs nothing.
 */
export const UI_EN = {
  "nav.rashifal": "Rashifal",
  "nav.kundli": "Kundli",
  "nav.milan": "Milan",
  "nav.panchang": "Panchang",
  "nav.ask": "Ask a reader",
  "nav.pricing": "Pricing",
  "nav.about": "About",
  "nav.readings": "Your readings",
  "nav.account": "Account",
  "nav.signin": "Sign in",
  "nav.readPalm": "Read My Palm",
  "nav.language": "Language",
  "tab.home": "Home",
  "tab.rashifal": "Rashifal",
  "tab.palm": "Palm",
  "tab.kundli": "Kundli",
  "tab.ask": "Ask",
  "picker.title": "Choose your language",
  "picker.subtitle":
    "Readings and the site will be shown in this language. You can change it any time.",
  "home.eyebrow": "Palm · Kundli · Rashifal",
  "home.title1": "Readings prepared",
  "home.title2": "for you alone.",
  "home.subtitle":
    "Explore the path ahead from your birth chart, or see what your palm says about you.",
  "home.choose": "Choose your reading",
  "home.inside": "Important answers inside your Mahakundli",
  "home.swipe": "areas — swipe →",
  "home.notOne": "Not one question. One report for your kundli.",
  "home.mahaLead": "Marriage, money, career, family, property and more life areas in one report.",
  "home.mahaBody":
    "Each life area checked separately, with personal timing from your running dasha and the next 3 years of major transits.",
  "home.mahaNote":
    "A reliable birth time and place give your Lagna, 12 houses and personal dasha dates.",
  "home.chipDasha": "Running dasha",
  "home.chipTiming": "Life-area timing",
  "home.chipTransits": "Major transits",
  "home.firstFree": "Get my first answer free ›",
  "home.fourDetails": "4 details · free to start · one personal answer before you pay",
  "home.step1": "Enter birth details",
  "home.step2": "See one answer free",
  "home.step3": "Open all life areas",
  "home.palmEyebrow": "Life path & nature",
  "home.palmTitle": "Palm Reading",
  "home.palmBody":
    "Your right palm read in the Indian tradition: how you think, care and work, your strengths and the lines, parvats and markings of your hand.",
  "home.palmFree": "How you think — free",
  "home.palmFull": "Full reading",
  "home.palmCta": "Read my palm ›",
  "home.palmStart": "Start free · Scan or upload",
  "home.askEyebrow": "One question, answered",
  "home.askTitle": "Ask a Reader",
  "home.askBody":
    "Ask about your own palm or chart. Readers with their own style reply in your language within a minute.",
  "home.askFree": "First question free",
  "home.askFrom": "Then from",
  "home.askCta": "Ask a reader ›",
  "home.explore": "Or explore one thing",
  "home.milanText": "Guna Milan out of 36 — free",
  "home.coupleTitle": "Couple Reading",
  "home.coupleText": "Both palms together",
  "home.rashifalText": "Today for your Moon sign — free",
  "home.kundliTitle": "Free Kundli",
  "home.kundliText": "Chart, planets and dasha — free",
  "home.beginsFree": "Every reading begins free · Pay only if you choose the full report",
  "home.allPrices": "All prices",
  "maha.eyebrow": "Mahakundli",
  "maha.title": "One report for your whole kundli",
  "maha.intro":
    "Each life area checked separately, with your running dasha, life-area timing and the next 3 years of major transits. Your first answer is free; the full Mahakundli is",
  "maha.pickArea": "1. Which answer would you like free?",
  "maha.details": "2. Your birth details",
  "maha.submit": "Get my first answer free",
  "maha.reading": "Reading your chart…",
  "maha.yourMaha": "Your Mahakundli",
  "maha.freeAnswer": "Your free answer",
  "maha.moreAnswers": "more answers in your Mahakundli",
  "maha.openAll": "Open all life areas",
  "maha.included":
    "Includes your running dasha, life-area timing and the next 3 years of major transits. Included with membership. Traditional Jyotish for reflection — no fear, no remedies to buy.",
  "maha.writing": "Writing your Mahakundli…",
  "maha.writingBody":
    "Thank you — it's unlocked. All life areas are being read from your chart. This takes about a minute.",
  "milan.score": "gunas",
  "milan.inside": "Inside your detailed Kundli Milan",
  "milan.open": "Open my detailed Milan",
  "milan.writing": "Writing your detailed Milan…",
  "pay.oneTime": "one-time",
  "pay.total": "total",
  "pay.gst": "+ GST",
  "pay.notAvailable": "Not available for purchase right now.",
  "dl.download": "Download / Save as PDF",
  "rashifal.title": "Today's horoscope",
  "rashifal.love": "Love & family",
  "rashifal.work": "Work",
  "rashifal.tip": "Tip for today",
  "rashifal.color": "Lucky colour",
  "rashifal.number": "Lucky number",
  "rashifal.other": "Other signs",
  "cta.title": "Get answers from your own Kundli",
  "cta.body":
    "Marriage, job, money, business and more life areas — each answered from your birth chart, with your running dasha and the next 3 years of transits.",
  "cta.then": "Then",
  "cta.forAll": "for all areas",
  "ask.question": "Have a question about your chart?",
  ...Object.fromEntries(
    LIFE_AREAS.flatMap((a) => [
      [`area.${a.id}.title`, a.title],
      [`area.${a.id}.question`, a.question],
    ]),
  ),
} as Record<string, string>;

export type UiKey = keyof typeof UI_EN;

const TABLE = (generated as { ui?: Record<string, Record<string, string>> }).ui ?? {};

/** Translate a site string; falls back to English if a translation is missing. */
export function t(lang: Language, key: string): string {
  return (lang !== "en" && TABLE[lang]?.[key]) || UI_EN[key] || key;
}

/** A bound translator for one language. */
export const translator = (lang: Language) => (key: string) => t(lang, key);
