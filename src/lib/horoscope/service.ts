import "server-only";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { getAiProvider, interpretationModel } from "@/lib/ai";
import { generateStructured } from "@/lib/ai/structured";
import { moonRashiAt, rashiName, siderealLongitude } from "@/lib/astro/chart";
import { RASHIS } from "@/lib/astro/constants";
import { getEnv } from "@/lib/config/env";
import { db } from "@/lib/db";
import { languageName, type Language } from "@/lib/i18n/languages";
import { logger } from "@/lib/logger";
import { runOnce } from "@/lib/pipeline/idempotency";
import { sanitizeText } from "@/lib/pipeline/safety";

/**
 * Daily rashifal for the 12 Moon signs. Written once per day and language in
 * a single AI call (so it costs almost nothing), grounded in where the Moon
 * and the slow planets actually are today, then cached for everyone.
 */
export const HoroscopeSchema = z.object({
  title: z.string().min(1).max(80),
  text: z.string().min(1).max(900),
  love: z.string().min(1).max(300),
  work: z.string().min(1).max(300),
  tip: z.string().min(1).max(200),
  luckyColor: z.string().min(1).max(30),
  luckyNumber: z.number().int().min(1).max(99),
});
export type Horoscope = z.infer<typeof HoroscopeSchema>;

const BatchSchema = z.object({
  signs: z.array(HoroscopeSchema.extend({ sign: z.number().int().min(0).max(11) })).length(12),
});

/** Today's date in India (IST), YYYY-MM-DD. */
export function todayIst(now = new Date()): string {
  return new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 10);
}

const HOUSE_THEMES = [
  "self, energy and fresh starts",
  "family, speech and savings habits",
  "courage, siblings and short journeys",
  "home, mother and inner peace",
  "creativity, children and joy",
  "routine, service and discipline",
  "partnership and close relationships",
  "change, research and inner work",
  "learning, teachers and faith",
  "work, duty and reputation",
  "friends, networks and hopes",
  "rest, letting go and reflection",
];

function skyToday(date: string) {
  const noonIst = new Date(`${date}T06:30:00Z`);
  const moon = moonRashiAt(noonIst);
  const slow = (["Sun", "Jupiter", "Saturn"] as const).map((p) => ({
    planet: p,
    rashi: Math.floor(siderealLongitude(p, noonIst) / 30),
  }));
  return { moon, slow };
}

/** Rule-based rashifal: used in demo mode and if the AI is unavailable. */
function fallback(date: string, sign: number): Horoscope {
  const { moon } = skyToday(date);
  const house = (moon - sign + 12) % 12;
  const seed = [...`${date}${sign}`].reduce((n, c) => n + c.charCodeAt(0), 0);
  const colors = ["Saffron", "White", "Green", "Yellow", "Red", "Blue", "Pink", "Orange", "Cream"];
  return {
    title: `A day for ${HOUSE_THEMES[house]!.split(",")[0]}`,
    text: `The Moon moves through ${rashiName(moon).name} today, your ${house + 1}${["st", "nd", "rd"][house] ?? "th"} house from ${RASHIS[sign]!.name}. Traditionally this lights up ${HOUSE_THEMES[house]}. Give these a little extra attention and keep the day simple.`,
    love: "Small gestures carry more weight than big words today.",
    work: "Finish what is already in hand before starting something new.",
    tip: "Take ten quiet minutes for yourself before the evening.",
    luckyColor: colors[seed % colors.length]!,
    luckyNumber: (seed % 9) + 1,
  };
}

async function generate(date: string, language: Language): Promise<void> {
  const provider = getAiProvider();
  const { moon, slow } = skyToday(date);
  let signs: (Horoscope & { sign: number })[];
  let providerName = "rules";
  if (provider.isMock) {
    signs = RASHIS.map((_, i) => ({ ...fallback(date, i), sign: i }));
  } else {
    const env = getEnv();
    const lines = RASHIS.map((r, i) => {
      const house = (moon - i + 12) % 12;
      return `- sign ${i} ${r.name} (${r.english}): Moon in house ${house + 1} (${HOUSE_THEMES[house]})`;
    }).join("\n");
    const result = await generateStructured({
      provider,
      task: "daily_horoscope",
      model: interpretationModel(provider),
      system: `You write the daily rashifal (Moon-sign horoscope) for an Indian astrology app, in ${languageName(language)}. Warm, specific and practical, like a trusted family astrologer in a newspaper column. Present it as traditional Vedic astrology for reflection.
NEVER predict specific events, dates, money amounts, lottery or market outcomes, illness, accidents, death, marriage, divorce, pregnancy, exam or job results. No doshas, remedies, gemstones, pujas, donations or fear. Suggest small, everyday actions instead.
Return valid JSON only.`,
      prompt: `Date: ${date}. The Moon is in ${rashiName(moon).name}. Sun in ${rashiName(slow[0]!.rashi).name}, Jupiter in ${rashiName(slow[1]!.rashi).name}, Saturn in ${rashiName(slow[2]!.rashi).name} (sidereal).
For each Moon sign, today's Moon transit house:
${lines}

Write all 12 signs, each grounded in its Moon transit house (mention it naturally once). For each: "title" (5–8 words), "text" (70–110 words), "love" and "work" (one or two sentences each), "tip" (one small practical action), "luckyColor", "luckyNumber" (1–9). Keep "sign" as the index given.
JSON: {"signs":[{"sign":0,"title":"","text":"","love":"","work":"","tip":"","luckyColor":"","luckyNumber":1}, …]}`,
      schema: BatchSchema,
      maxTokens: 9000,
      timeoutMs: env.AI_TIMEOUT_MS,
      maxAttempts: env.AI_MAX_ATTEMPTS,
      thinking: "low",
    });
    providerName = provider.name;
    signs = result.data.signs.map((s) => ({
      ...s,
      text: sanitizeText(s.text).text || fallback(date, s.sign).text,
      love: sanitizeText(s.love).text || fallback(date, s.sign).love,
      work: sanitizeText(s.work).text || fallback(date, s.sign).work,
      tip: sanitizeText(s.tip).text || fallback(date, s.sign).tip,
    }));
  }
  await db.dailyHoroscope.createMany({
    data: signs.map(({ sign, ...data }) => ({
      date,
      sign,
      language,
      data: data as unknown as Prisma.InputJsonValue,
      provider: providerName,
    })),
    skipDuplicates: true,
  });
}

/** Today's horoscope for one sign (written on first request of the day). */
export async function getHoroscope(
  sign: number,
  language: Language,
  date = todayIst(),
): Promise<Horoscope> {
  const find = () =>
    db.dailyHoroscope.findUnique({ where: { date_sign_language: { date, sign, language } } });
  let row = await find();
  if (!row) {
    try {
      await runOnce("horoscope", `${date}:${language}`, () => generate(date, language));
    } catch (error) {
      logger.error("horoscope_generation_failed", { date, language, error });
      return fallback(date, sign);
    }
    row = await find();
  }
  const parsed = row ? HoroscopeSchema.safeParse(row.data) : null;
  return parsed?.success ? parsed.data : fallback(date, sign);
}
