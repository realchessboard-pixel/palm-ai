import "server-only";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { getAiProvider, interpretationModel } from "@/lib/ai";
import { generateStructured } from "@/lib/ai/structured";
import { computeChart, currentDasha, type Chart } from "@/lib/astro/chart";
import { GRAHA_NAMES, NAKSHATRAS, RASHIS } from "@/lib/astro/constants";
import type { Actor } from "@/lib/auth/actor";
import { getEnv } from "@/lib/config/env";
import { db } from "@/lib/db";
import { AppError, isAppError } from "@/lib/http/errors";
import { runOnce } from "@/lib/pipeline/idempotency";
import { sanitizeText } from "@/lib/pipeline/safety";
import { getOwnedKundli, hasKundliAccess } from "./access";

export const BirthSchema = z.object({
  year: z.number().int().min(1900).max(2100),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
  lat: z.number().min(-66).max(66),
  lon: z.number().min(-180).max(180),
  tzMinutes: z.number().int().min(-840).max(840),
  placeName: z.string().trim().min(1).max(80),
  timeKnown: z.boolean(),
});
export type StoredBirth = z.infer<typeof BirthSchema>;

export const KUNDLI_SECTIONS = [
  { id: "nature", title: "Your nature (Lagna & Moon)" },
  { id: "mind", title: "Mind and emotions" },
  { id: "career", title: "Work and career style" },
  { id: "relationships", title: "Relationships" },
  { id: "strengths", title: "Strengths to lean on" },
  { id: "dasha", title: "Your current dasha" },
] as const;

const ReportSchema = z.object({
  headline: z.string().min(1).max(140),
  sections: z
    .array(
      z.object({
        id: z.enum(KUNDLI_SECTIONS.map((s) => s.id) as [string, ...string[]]),
        text: z.string().min(1).max(2200),
      }),
    )
    .min(4)
    .max(KUNDLI_SECTIONS.length),
});
export type KundliReport = z.infer<typeof ReportSchema>;

export async function createKundli(
  input: { name: string; birth: StoredBirth; guestKeyHash: string | null },
  actor: Actor,
): Promise<{ kundliId: string }> {
  const chart = computeChart(input.birth);
  const kundli = await db.kundliProfile.create({
    data: {
      userId: actor.user?.id ?? null,
      guestKeyHash: actor.user ? null : input.guestKeyHash,
      name: input.name.trim().slice(0, 60) || "My Kundli",
      birth: input.birth as unknown as Prisma.InputJsonValue,
      chart: chart as unknown as Prisma.InputJsonValue,
    },
  });
  return { kundliId: kundli.id };
}

export async function getKundliView(id: string, actor: Actor) {
  const kundli = await getOwnedKundli(id, actor);
  const unlocked = await hasKundliAccess(kundli);
  const report = unlocked && kundli.report ? ReportSchema.safeParse(kundli.report) : null;
  return {
    id: kundli.id,
    name: kundli.name,
    birth: BirthSchema.parse(kundli.birth),
    chart: kundli.chart as unknown as Chart,
    unlocked,
    status: kundli.reportStatus,
    report: report?.success ? report.data : null,
  };
}

/** Plain facts from the chart that the reading must stay grounded in. */
export function chartFacts(chart: Chart, timeKnown: boolean): string {
  const lines: string[] = [];
  if (timeKnown) {
    lines.push(
      `Lagna (ascendant): ${RASHIS[chart.lagna.rashi]!.name}, ruled by ${RASHIS[chart.lagna.rashi]!.lord}`,
    );
  } else {
    lines.push(
      "Birth time unknown: do not discuss the Lagna or houses; read from the Moon instead.",
    );
  }
  lines.push(
    `Moon: ${RASHIS[chart.moon.rashi]!.name}, nakshatra ${NAKSHATRAS[chart.moon.nakshatra]} pada ${chart.moon.pada}`,
  );
  for (const p of chart.planets) {
    lines.push(
      `${GRAHA_NAMES[p.graha].sanskrit} (${p.graha}) in ${RASHIS[p.rashi]!.name}${timeKnown ? `, house ${p.house}` : ""}${p.retrograde && p.graha !== "Rahu" && p.graha !== "Ketu" ? ", retrograde" : ""}`,
    );
  }
  const now = currentDasha(chart.dasha);
  if (now.maha) {
    lines.push(
      `Current Vimshottari dasha: ${now.maha.lord} mahadasha (until ${now.maha.end.slice(0, 4)})${now.antar ? `, ${now.antar.lord} antardasha (until ${now.antar.end.slice(0, 7)})` : ""}`,
    );
  }
  return lines.map((l) => `- ${l}`).join("\n");
}

function ruleBasedReport(chart: Chart): KundliReport {
  const moon = RASHIS[chart.moon.rashi]!;
  const lagna = RASHIS[chart.lagna.rashi]!;
  const now = currentDasha(chart.dasha);
  return {
    headline: `A ${lagna.name} ascendant with the Moon in ${moon.name}`,
    sections: [
      {
        id: "nature",
        text: `With ${lagna.name} rising, ruled by ${lagna.lord}, tradition reads a nature shaped by that planet's qualities. (Demo mode: this is a sample reading.)`,
      },
      {
        id: "mind",
        text: `The Moon in ${moon.name}, in ${NAKSHATRAS[chart.moon.nakshatra]} nakshatra, colours how you feel and respond.`,
      },
      { id: "career", text: "Your tenth house and its lord describe your working style." },
      { id: "relationships", text: "Your seventh house describes how you partner with others." },
      {
        id: "dasha",
        text: now.maha
          ? `You are in the ${now.maha.lord} mahadasha.`
          : "Your dasha sequence is shown above.",
      },
    ],
  };
}

/** Write the paid Kundli reading once (claim-guarded; 409 while in progress). */
export function generateKundliReport(id: string, actor: Actor) {
  return runOnce("kundli-report", id, () => run(id, actor));
}

async function run(id: string, actor: Actor): Promise<{ status: "COMPLETE" }> {
  const kundli = await getOwnedKundli(id, actor);
  if (kundli.reportStatus === "COMPLETE" && kundli.report) return { status: "COMPLETE" };
  if (!(await hasKundliAccess(kundli))) {
    throw new AppError("FORBIDDEN", { message: "Unlock the Kundli reading to see it." });
  }
  const claimed = await db.kundliProfile.updateMany({
    where: {
      id,
      OR: [
        { reportStatus: { in: ["NONE", "FAILED"] } },
        { reportStatus: "GENERATING", updatedAt: { lt: new Date(Date.now() - 5 * 60_000) } },
      ],
    },
    data: { reportStatus: "GENERATING" },
  });
  if (claimed.count === 0) {
    throw new AppError("CONFLICT", { message: "Your Kundli reading is being written." });
  }
  try {
    const birth = BirthSchema.parse(kundli.birth);
    const chart = kundli.chart as unknown as Chart;
    const provider = getAiProvider();
    let report: KundliReport;
    if (provider.isMock) {
      report = ruleBasedReport(chart);
    } else {
      const env = getEnv();
      const result = await generateStructured({
        provider,
        task: "kundli_report",
        model: interpretationModel(provider),
        system: `You are a warm, experienced Vedic astrologer writing a personal Kundli reading. Speak to the person as "you". Plain, elegant English with Sanskrit terms explained (rashi, bhava, graha, dasha).
Ground everything ONLY in the chart facts given. Present it as traditional Jyotish for reflection: "traditionally…", "in Jyotish this is read as…". Never claim certainty.
NEVER predict events, dates, marriage timing, divorce, children, illness, accidents, death, lifespan, wealth amounts, exam or job results. No doshas, Manglik or Sade Sati warnings, remedies, gemstones, pujas, mantras to buy or donations, and no fear. Describe the current dasha only as themes for reflection.
Return valid JSON only.`,
        prompt: `Person: ${kundli.name}
CHART FACTS (sidereal, Lahiri):
${chartFacts(chart, birth.timeKnown)}

Write:
- "headline": one warm line about this chart (not a prediction).
- "sections": each 2–3 short paragraphs (separated by blank lines), ids: ${KUNDLI_SECTIONS.map((s) => `"${s.id}" (${s.title})`).join(", ")}.${birth.timeKnown ? "" : ' Without the birth time, read "nature" from the Moon, not the Lagna, and say so gently.'}
JSON: {"headline":"…","sections":[{"id":"nature","text":"…"}, …]}`,
        schema: ReportSchema,
        maxTokens: 8000,
        timeoutMs: env.AI_TIMEOUT_MS,
        maxAttempts: env.AI_MAX_ATTEMPTS,
        thinking: env.AI_INTERPRETATION_THINKING,
      });
      report = {
        headline:
          sanitizeText(result.data.headline).text || "Your birth chart, read the traditional way",
        sections: result.data.sections
          .map((s) => ({ ...s, text: sanitizeText(s.text).text }))
          .filter((s) => s.text),
      };
    }
    await db.kundliProfile.update({
      where: { id },
      data: { reportStatus: "COMPLETE", report: report as unknown as Prisma.InputJsonValue },
    });
    return { status: "COMPLETE" };
  } catch (error) {
    await db.kundliProfile
      .update({ where: { id }, data: { reportStatus: "FAILED" } })
      .catch(() => undefined);
    throw isAppError(error) ? error : new AppError("AI_UNAVAILABLE", { internal: error });
  }
}
