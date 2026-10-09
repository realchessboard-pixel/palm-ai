import "server-only";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { getAiProvider, premiumModel, premiumThinking } from "@/lib/ai";
import { generateStructured } from "@/lib/ai/structured";
import { computeChart, type Chart } from "@/lib/astro/chart";
import { NAKSHATRAS, RASHIS } from "@/lib/astro/constants";
import { gunaMilan, milanSummary, type MilanResult } from "@/lib/astro/milan";
import type { Actor } from "@/lib/auth/actor";
import { getEnv } from "@/lib/config/env";
import { db } from "@/lib/db";
import { AppError, isAppError } from "@/lib/http/errors";
import { runOnce } from "@/lib/pipeline/idempotency";
import { sanitizeText } from "@/lib/pipeline/safety";
import { DEFAULT_LANGUAGE, languageName, type Language } from "@/lib/i18n/languages";
import { getOwnedMilan, hasMilanAccess } from "./access";
import { BirthSchema, chartFacts, type StoredBirth } from "./service";

export const MILAN_SECTIONS = [
  { id: "overview", title: "The two of you, in short" },
  { id: "kootas", title: "Your 8 kootas, explained" },
  { id: "minds", title: "Moon signs: how you feel and react" },
  { id: "partnership", title: "Partnership in both charts (7th house & Venus)" },
  { id: "timing", title: "Your running dashas side by side" },
  { id: "guidance", title: "Guidance for the two of you" },
] as const;
const SECTION_IDS = MILAN_SECTIONS.map((s) => s.id) as [string, ...string[]];

const ReportSchema = z.object({
  headline: z.string().min(1).max(140),
  sections: z
    .array(z.object({ id: z.enum(SECTION_IDS), text: z.string().min(1).max(4000) }))
    .min(4),
});
export type MilanReport = z.infer<typeof ReportSchema>;

/** Read-back shape: the safety filter may drop a section; a paid report must still show. */
const StoredReportSchema = z.object({
  headline: z.string(),
  sections: z.array(z.object({ id: z.enum(SECTION_IDS), text: z.string().min(1) })).min(1),
});

export async function createMilan(
  input: {
    a: { name: string; birth: StoredBirth };
    b: { name: string; birth: StoredBirth };
    guestKeyHash: string | null;
  },
  actor: Actor,
): Promise<{ milanId: string }> {
  const chartA = computeChart(input.a.birth);
  const chartB = computeChart(input.b.birth);
  const result = gunaMilan(chartA.moon, chartB.moon);
  const milan = await db.milanProfile.create({
    data: {
      userId: actor.user?.id ?? null,
      guestKeyHash: actor.user ? null : input.guestKeyHash,
      nameA: input.a.name.trim().slice(0, 60) || "Person 1",
      nameB: input.b.name.trim().slice(0, 60) || "Person 2",
      birthA: input.a.birth as unknown as Prisma.InputJsonValue,
      birthB: input.b.birth as unknown as Prisma.InputJsonValue,
      chartA: chartA as unknown as Prisma.InputJsonValue,
      chartB: chartB as unknown as Prisma.InputJsonValue,
      result: result as unknown as Prisma.InputJsonValue,
    },
  });
  return { milanId: milan.id };
}

export async function getMilanView(id: string, actor: Actor) {
  const milan = await getOwnedMilan(id, actor);
  const unlocked = await hasMilanAccess(milan);
  const result = milan.result as unknown as MilanResult;
  const chartA = milan.chartA as unknown as Chart;
  const chartB = milan.chartB as unknown as Chart;
  const report = unlocked && milan.report ? StoredReportSchema.safeParse(milan.report) : null;
  return {
    id: milan.id,
    nameA: milan.nameA,
    nameB: milan.nameB,
    moonA: { rashi: chartA.moon.rashi, nakshatra: chartA.moon.nakshatra },
    moonB: { rashi: chartB.moon.rashi, nakshatra: chartB.moon.nakshatra },
    total: result.total,
    summary: milanSummary(result.total),
    // The koota-by-koota table is part of the detailed Milan: not sent until unlocked.
    kootas: unlocked ? result.kootas : null,
    unlocked,
    report: report?.success ? report.data : null,
  };
}

export function generateMilanReport(
  id: string,
  actor: Actor,
  language: Language = DEFAULT_LANGUAGE,
) {
  return runOnce("milan-report", id, () => run(id, actor, language));
}

async function run(id: string, actor: Actor, language: Language): Promise<{ status: "COMPLETE" }> {
  const milan = await getOwnedMilan(id, actor);
  if (milan.reportStatus === "COMPLETE" && milan.report) return { status: "COMPLETE" };
  if (!(await hasMilanAccess(milan))) {
    throw new AppError("FORBIDDEN", { message: "Unlock the detailed Kundli Milan to see it." });
  }
  const claimed = await db.milanProfile.updateMany({
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
    throw new AppError("CONFLICT", { message: "Your detailed Milan is being written." });
  }
  try {
    const result = milan.result as unknown as MilanResult;
    const chartA = milan.chartA as unknown as Chart;
    const chartB = milan.chartB as unknown as Chart;
    const birthA = BirthSchema.parse(milan.birthA);
    const birthB = BirthSchema.parse(milan.birthB);
    const provider = getAiProvider();
    let report: MilanReport;
    if (provider.isMock) {
      report = {
        headline: `${result.total} of 36 gunas`,
        sections: MILAN_SECTIONS.map((s) => ({
          id: s.id,
          text: `${s.title}. (Demo mode: sample text.)`,
        })),
      };
    } else {
      const env = getEnv();
      const kootas = result.kootas
        .map(
          (k) =>
            `- ${k.name}: ${k.score}/${k.max} (${milan.nameA}: ${k.a}; ${milan.nameB}: ${k.b})`,
        )
        .join("\n");
      const out = await generateStructured({
        provider,
        task: "kundli_report",
        model: premiumModel(provider),
        system: `You are a senior, warm Vedic astrologer writing a paid, detailed Kundli Milan for two people. Ground everything ONLY in the facts given. Present it as traditional Jyotish for reflection: "traditionally…". Explain Sanskrit terms briefly.
Be balanced and kind: a low koota is something to understand, never a verdict. Never say the match is good or bad, never tell them to marry or not marry, never predict marriage dates, divorce, children, illness, death or money. No doshas (including Mangal dosha / Manglik, Nadi dosha or Bhakoot dosha wording), remedies, pujas, gemstones or fear.
Return valid JSON only.`,
        prompt: `GUNA MILAN: ${result.total}/36
${kootas}

${milan.nameA.toUpperCase()}'S CHART:
${chartFacts(chartA, birthA.timeKnown)}

${milan.nameB.toUpperCase()}'S CHART:
${chartFacts(chartB, birthB.timeKnown)}

Write the detailed Milan, by name, as a senior consultant. Sections (2–4 short paragraphs each; "kootas" covers all 8 kootas one by one, 2–3 sentences each):
${MILAN_SECTIONS.map((s) => `- "${s.id}": ${s.title}`).join("\n")}
If a birth time is unknown, don't discuss that person's houses. WRITE ALL TEXT IN ${languageName(language)}${language === "en" ? "" : " (natural, native wording in its own script; keep Jyotish terms like Lagna, dasha, rashi)"}.
JSON: {"headline":"…","sections":[{"id":"overview","text":"…"}, …]}`,
        schema: ReportSchema,
        maxTokens: 16000,
        timeoutMs: env.AI_TIMEOUT_MS,
        maxAttempts: env.AI_MAX_ATTEMPTS,
        thinking: premiumThinking(),
      });
      report = {
        headline: sanitizeText(out.data.headline).text || `${result.total} of 36 gunas`,
        sections: out.data.sections
          .map((s) => ({ ...s, text: sanitizeText(s.text).text }))
          .filter((s) => s.text),
      };
    }
    if (report.sections.length === 0) {
      // Nothing usable survived the safety filter: fail (retryable) rather than save an empty report.
      throw new AppError("AI_UNAVAILABLE", {
        internal: new Error("empty report after safety filter"),
      });
    }
    await db.milanProfile.update({
      where: { id },
      data: { reportStatus: "COMPLETE", report: report as unknown as Prisma.InputJsonValue },
    });
    return { status: "COMPLETE" };
  } catch (error) {
    await db.milanProfile
      .update({ where: { id }, data: { reportStatus: "FAILED" } })
      .catch(() => undefined);
    throw isAppError(error) ? error : new AppError("AI_UNAVAILABLE", { internal: error });
  }
}

export const describeMoon = (m: { rashi: number; nakshatra: number }) =>
  `${RASHIS[m.rashi]!.name} Moon, ${NAKSHATRAS[m.nakshatra]}`;
