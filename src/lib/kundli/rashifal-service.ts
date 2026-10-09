import "server-only";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { getAiProvider, premiumModel, premiumThinking } from "@/lib/ai";
import { generateStructured } from "@/lib/ai/structured";
import { rahuLongitude, rashiOf, siderealLongitude, type Chart } from "@/lib/astro/chart";
import { RASHIS } from "@/lib/astro/constants";
import type { Actor } from "@/lib/auth/actor";
import { getEnv } from "@/lib/config/env";
import { db } from "@/lib/db";
import { AppError, isAppError } from "@/lib/http/errors";
import { DEFAULT_LANGUAGE, languageName, type Language } from "@/lib/i18n/languages";
import { runOnce } from "@/lib/pipeline/idempotency";
import { sanitizeText } from "@/lib/pipeline/safety";
import { getOwnedKundli, hasKundliAccess } from "./access";
import { BirthSchema, chartFacts } from "./service";

/**
 * Detailed Rashifal: a personal 12-month guide. Each month is grounded in the
 * real (calculated) positions of the Sun, Mars, Jupiter, Saturn and Rahu,
 * counted as houses from the person's own Moon sign and Lagna.
 */
const MonthSchema = z.object({
  month: z.string().min(1).max(20),
  title: z.string().min(1).max(100),
  text: z.string().min(1).max(1500),
  focus: z.string().min(1).max(200),
});
const YearSchema = z.object({
  headline: z.string().min(1).max(160),
  overview: z.string().min(1).max(2000),
  months: z.array(MonthSchema).min(10).max(12),
});
/**
 * What is stored after the safety filter, which may empty a line or drop a
 * month. Reads use this looser shape so a saved, paid report always shows.
 */
const StoredYearSchema = z.object({
  headline: z.string(),
  overview: z.string(),
  months: z
    .array(z.object({ month: z.string(), title: z.string(), text: z.string(), focus: z.string() }))
    .min(1),
});
export type YearReport = z.infer<typeof StoredYearSchema>;

const PLANETS = ["Sun", "Mars", "Jupiter", "Saturn"] as const;

/** First day of each of the next 12 months (UTC). */
export function nextMonths(from = new Date()): Date[] {
  return Array.from(
    { length: 12 },
    (_, i) => new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + i, 15)),
  );
}

export function monthFacts(chart: Chart, timeKnown: boolean, from = new Date()): string {
  const house = (r: number, base: number) => ((r - base + 12) % 12) + 1;
  return nextMonths(from)
    .map((d) => {
      const label = d.toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });
      const parts = [
        ...PLANETS.map((p) => ({ p, r: rashiOf(siderealLongitude(p, d)) })),
        { p: "Rahu", r: rashiOf(rahuLongitude(d)) },
      ].map(
        ({ p, r }) =>
          `${p} in ${RASHIS[r]!.name} (house ${house(r, chart.moon.rashi)} from Moon${timeKnown ? `, ${house(r, chart.lagna.rashi)} from Lagna` : ""})`,
      );
      return `- ${label}: ${parts.join("; ")}`;
    })
    .join("\n");
}

export async function getRashifalView(id: string, actor: Actor) {
  const kundli = await getOwnedKundli(id, actor);
  const unlocked = await hasKundliAccess(kundli, "RASHIFAL_REPORT");
  const chart = kundli.chart as unknown as Chart;
  const parsed =
    unlocked && kundli.yearReport ? StoredYearSchema.safeParse(kundli.yearReport) : null;
  return {
    id: kundli.id,
    name: kundli.name,
    moonRashi: chart.moon.rashi,
    unlocked,
    report: parsed?.success ? parsed.data : null,
    months: nextMonths().map((d) =>
      d.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }),
    ),
  };
}

export function generateRashifalReport(
  id: string,
  actor: Actor,
  language: Language = DEFAULT_LANGUAGE,
) {
  return runOnce("rashifal-report", id, () => run(id, actor, language));
}

async function run(id: string, actor: Actor, language: Language): Promise<{ status: "COMPLETE" }> {
  const kundli = await getOwnedKundli(id, actor);
  if (kundli.yearStatus === "COMPLETE" && kundli.yearReport) return { status: "COMPLETE" };
  if (!(await hasKundliAccess(kundli, "RASHIFAL_REPORT"))) {
    throw new AppError("FORBIDDEN", { message: "Unlock the Detailed Rashifal to see it." });
  }
  const claimed = await db.kundliProfile.updateMany({
    where: {
      id,
      OR: [
        { yearStatus: { in: ["NONE", "FAILED"] } },
        { yearStatus: "GENERATING", updatedAt: { lt: new Date(Date.now() - 5 * 60_000) } },
      ],
    },
    data: { yearStatus: "GENERATING" },
  });
  if (claimed.count === 0) {
    throw new AppError("CONFLICT", { message: "Your Detailed Rashifal is being written." });
  }
  try {
    const chart = kundli.chart as unknown as Chart;
    const birth = BirthSchema.parse(kundli.birth);
    const provider = getAiProvider();
    let report: YearReport;
    if (provider.isMock) {
      const months = nextMonths().map((d) =>
        d.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }),
      );
      report = {
        headline: `${RASHIS[chart.moon.rashi]!.name} Moon: your next 12 months`,
        overview: "Demo mode: sample text.",
        months: months.map((m) => ({
          month: m,
          title: m,
          text: "Demo mode: sample text.",
          focus: "—",
        })),
      };
    } else {
      const env = getEnv();
      const out = await generateStructured({
        provider,
        task: "kundli_report",
        model: premiumModel(provider),
        system: `You are a senior, warm Vedic astrologer writing a paid, personal 12-month rashifal. Ground every month ONLY in the transit facts given, counted from this person's own Moon sign (and Lagna if given). Traditional Jyotish for reflection: "traditionally this period favours…". Practical and specific.
NEVER predict specific events, exact dates, marriage, divorce, pregnancy, illness, accidents, death, money amounts, exam or job results. No doshas, Sade Sati warnings, remedies, gemstones, pujas or fear.
Return valid JSON only.`,
        prompt: `Person: ${kundli.name}
BIRTH CHART:
${chartFacts(chart, birth.timeKnown)}

TRANSITS FOR THE NEXT 12 MONTHS (sidereal, Lahiri; mid-month positions):
${monthFacts(chart, birth.timeKnown)}

Write: "headline" (one line), "overview" (2 short paragraphs on the year's main themes from Jupiter, Saturn and Rahu), and "months": one entry per month above with "month" (as given), "title" (5–8 words), "text" (110–160 words: work, relationships, home and wellbeing themes from that month's transits) and "focus" (one practical focus for the month).
WRITE ALL TEXT IN ${languageName(language)}.
JSON: {"headline":"…","overview":"…","months":[{"month":"…","title":"…","text":"…","focus":"…"}]}`,
        schema: YearSchema,
        maxTokens: 16000,
        timeoutMs: env.AI_TIMEOUT_MS,
        maxAttempts: env.AI_MAX_ATTEMPTS,
        thinking: premiumThinking(),
      });
      report = {
        headline: sanitizeText(out.data.headline).text || "Your next 12 months",
        overview: sanitizeText(out.data.overview).text,
        months: out.data.months
          .map((m) => ({
            month: m.month,
            title: sanitizeText(m.title).text,
            text: sanitizeText(m.text).text,
            focus: sanitizeText(m.focus).text,
          }))
          .filter((m) => m.text),
      };
    }
    if (report.months.length === 0) {
      // Nothing usable survived the safety filter: fail (retryable) rather than save an empty report.
      throw new AppError("AI_UNAVAILABLE", {
        internal: new Error("empty report after safety filter"),
      });
    }
    await db.kundliProfile.update({
      where: { id },
      data: { yearStatus: "COMPLETE", yearReport: report as unknown as Prisma.InputJsonValue },
    });
    return { status: "COMPLETE" };
  } catch (error) {
    await db.kundliProfile
      .update({ where: { id }, data: { yearStatus: "FAILED" } })
      .catch(() => undefined);
    throw isAppError(error) ? error : new AppError("AI_UNAVAILABLE", { internal: error });
  }
}
