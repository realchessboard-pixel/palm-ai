import "server-only";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { getAiProvider, interpretationModel, premiumModel, premiumThinking } from "@/lib/ai";
import { generateStructured } from "@/lib/ai/structured";
import { computeChart, currentDasha, upcomingTransits, type Chart } from "@/lib/astro/chart";
import { GRAHA_NAMES, NAKSHATRAS, RASHIS } from "@/lib/astro/constants";
import type { Actor } from "@/lib/auth/actor";
import { getEnv } from "@/lib/config/env";
import { db } from "@/lib/db";
import { AppError, isAppError } from "@/lib/http/errors";
import { runOnce } from "@/lib/pipeline/idempotency";
import { sanitizeText } from "@/lib/pipeline/safety";
import { DEFAULT_LANGUAGE, languageName, type Language } from "@/lib/i18n/languages";
import { getOwnedKundli, hasKundliAccess } from "./access";
import { LIFE_AREAS, LIFE_AREA_IDS, lifeArea, type LifeAreaId } from "./areas";

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

/**
 * The stored report, read back after the safety filter (which may drop an
 * area). Loose on purpose: a saved, paid report must always show.
 */
const ReportSchema = z.object({
  headline: z.string(),
  areas: z.array(z.object({ id: z.enum(LIFE_AREA_IDS), text: z.string().min(1) })).min(1),
});
export type KundliReport = z.infer<typeof ReportSchema>;

const PartSchema = z.object({
  headline: z.string().min(1).max(140),
  areas: z.array(z.object({ id: z.enum(LIFE_AREA_IDS), text: z.string().min(1).max(2000) })).min(1),
});

export const TeaserSchema = z.object({ area: z.enum(LIFE_AREA_IDS), text: z.string().min(1) });
export type KundliTeaser = z.infer<typeof TeaserSchema>;

const SYSTEM = `You are a warm, experienced Vedic astrologer (Jyotish). Speak to the person as "you", in plain, elegant English, explaining Sanskrit terms briefly.
Ground everything ONLY in the chart facts given. Present it as traditional Jyotish for reflection: "traditionally…", "your chart suggests…". Never claim certainty.
You may name the dasha and transit PERIODS given (with their dates) as times traditionally associated with a theme. NEVER predict specific events: no marriage dates, divorce, pregnancy or children's births, illness, accidents, death, lifespan, exam or job results, or money amounts. Health means energy and habits only, never diagnoses. No doshas, Manglik or Sade Sati warnings, remedies, gemstones, pujas, mantras or donations, and no fear.
Return valid JSON only.`;

export async function createKundli(
  input: {
    name: string;
    birth: StoredBirth;
    area: LifeAreaId;
    guestKeyHash: string | null;
    language?: Language;
    /** The free Mahakundli answer; off for the Detailed Rashifal (no AI cost before purchase). */
    withTeaser?: boolean;
  },
  actor: Actor,
): Promise<{ kundliId: string }> {
  const chart = computeChart(input.birth);
  const teaser =
    input.withTeaser === false
      ? null
      : await writeTeaser(
          input.name,
          input.birth,
          chart,
          input.area,
          input.language ?? DEFAULT_LANGUAGE,
        );
  const kundli = await db.kundliProfile.create({
    data: {
      userId: actor.user?.id ?? null,
      guestKeyHash: actor.user ? null : input.guestKeyHash,
      name: input.name.trim().slice(0, 60) || "My Kundli",
      birth: input.birth as unknown as Prisma.InputJsonValue,
      chart: chart as unknown as Prisma.InputJsonValue,
      ...(teaser ? { teaser: teaser as unknown as Prisma.InputJsonValue } : {}),
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
    teaser: kundli.teaser ? (TeaserSchema.safeParse(kundli.teaser).data ?? null) : null,
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
  const transits = upcomingTransits(new Date());
  if (transits.length) {
    lines.push(
      `Major transits ahead: ${transits.map((t) => `${t.planet} enters ${RASHIS[t.rashi]!.name} (${t.date})`).join("; ")}`,
    );
  }
  return lines.map((l) => `- ${l}`).join("\n");
}

/**
 * The one free answer. Deliberately small (one area, ~150 words, low
 * thinking) so a visitor who doesn't buy costs well under a rupee.
 */
async function writeTeaser(
  name: string,
  birth: StoredBirth,
  chart: Chart,
  area: LifeAreaId,
  language: Language,
): Promise<KundliTeaser> {
  const a = lifeArea(area)!;
  const provider = getAiProvider();
  if (provider.isMock) {
    return { area, text: `${a.title}: read from your ${a.houses}. (Demo mode: sample answer.)` };
  }
  const env = getEnv();
  try {
    const result = await generateStructured({
      provider,
      task: "kundli_report",
      model: interpretationModel(provider),
      system: SYSTEM,
      prompt: `Person: ${name || "the visitor"}
CHART FACTS (sidereal, Lahiri):
${chartFacts(chart, birth.timeKnown)}

Answer ONE life area only: "${a.title}" — the question "${a.question}". Look at ${a.houses}. 110–160 words, two short paragraphs, specific to this chart, ending with one practical reflection.\n\nWRITE ALL TEXT IN ${languageName(language)}${language === "en" ? "" : " (natural, native wording in its own script; keep Jyotish terms like Lagna, dasha, rashi)"}.
JSON: {"text":"…"}`,
      schema: z.object({ text: z.string().min(1).max(1500) }),
      maxTokens: 900,
      timeoutMs: env.AI_TIMEOUT_MS,
      maxAttempts: env.AI_MAX_ATTEMPTS,
      thinking: "low",
    });
    const text = sanitizeText(result.data.text).text;
    if (text) return { area, text };
  } catch {
    // Fall through to a simple, honest answer rather than failing the form.
  }
  return {
    area,
    text: `Your ${a.title.toLowerCase()} is read from your ${a.houses}. Your full answer will be written in your Mahakundli.`,
  };
}

function ruleBasedReport(chart: Chart): KundliReport {
  const moon = RASHIS[chart.moon.rashi]!;
  return {
    headline: `A ${RASHIS[chart.lagna.rashi]!.name} ascendant with the Moon in ${moon.name}`,
    areas: LIFE_AREAS.map((a) => ({
      id: a.id,
      text: `${a.title}: traditionally read from your ${a.houses}. (Demo mode: sample reading.)`,
    })),
  };
}

/** Write the paid Kundli reading once (claim-guarded; 409 while in progress). */
export function generateKundliReport(
  id: string,
  actor: Actor,
  language: Language = DEFAULT_LANGUAGE,
) {
  return runOnce("kundli-report", id, () => run(id, actor, language));
}

async function run(id: string, actor: Actor, language: Language): Promise<{ status: "COMPLETE" }> {
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
      // Two halves written in parallel: deep (premium) thinking over 17 areas in
      // one call can take over a minute; halves keep each call well inside limits.
      const half = Math.ceil(LIFE_AREAS.length / 2);
      const parts = [LIFE_AREAS.slice(0, half), LIFE_AREAS.slice(half)];
      const results = await Promise.all(
        parts.map((areas, i) =>
          generateStructured({
            provider,
            task: "kundli_report",
            model: premiumModel(provider),
            system: SYSTEM,
            prompt: `Person: ${kundli.name}
CHART FACTS (sidereal, Lahiri):
${chartFacts(chart, birth.timeKnown)}

You are writing part ${i + 1} of 2 of a paid Mahakundli. Answer each of these life areas separately and in depth, 120–180 words each (one or two short paragraphs), like a senior Jyotish consultant: name the exact houses, their lords and where they sit, the grahas involved, and where relevant the dasha or transit periods above with their dates as periods traditionally associated with that theme. End each area with one practical guidance line.${birth.timeKnown ? "" : " The birth time is unknown: read from the Moon, not the Lagna or houses, and say so once."}
${areas.map((a) => `- "${a.id}": ${a.title} — ${a.question} (${a.houses})`).join("\n")}\n\nWRITE ALL TEXT IN ${languageName(language)}${language === "en" ? "" : " (natural, native wording in its own script; keep Jyotish terms like Lagna, dasha, rashi)"}.
JSON: {"headline":"…","areas":[{"id":"${areas[0]!.id}","text":"…"}, …]}`,
            schema: PartSchema,
            maxTokens: 16000,
            timeoutMs: env.AI_TIMEOUT_MS,
            maxAttempts: env.AI_MAX_ATTEMPTS,
            thinking: premiumThinking(),
          }),
        ),
      );
      report = {
        headline:
          sanitizeText(results[0]!.data.headline).text ||
          "Your birth chart, read the traditional way",
        areas: results
          .flatMap((r) => r.data.areas)
          .map((x) => ({ ...x, text: sanitizeText(x.text).text }))
          .filter((x) => x.text),
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
