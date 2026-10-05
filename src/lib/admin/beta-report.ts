import "server-only";
import { getEnv } from "@/lib/config/env";
import { db } from "@/lib/db";
import { PalmAnalysisSchema } from "@/lib/schemas/palm-analysis";

/**
 * Internal beta report: one row per reading with what a tester needs to judge
 * it — hands, confidence, stage timings, retries, model and estimated cost.
 * Admin-only. Contains no images, names or emails.
 */
export interface BetaReportRow {
  readingId: string;
  createdAt: string;
  status: string;
  errorCode: string | null;
  rejectionReason: string | null;
  isDemo: boolean;
  selectedHand: "left" | "right";
  detectedHand: string | null;
  detectedHandConfidence: number | null;
  /** True when the model disagreed with the selection (the selection is still used). */
  handMismatch: boolean | null;
  analysisConfidence: number | null;
  stage1Ms: number | null;
  stage2Ms: number | null;
  totalMs: number | null;
  analysisAttempts: number | null;
  interpretationAttempts: number | null;
  /** Extra attempts after the first, across both stages (validation failures or transient errors). */
  retries: number;
  /** Sentences/items removed by the grounding and safety filters. */
  filteredItems: number | null;
  provider: string | null;
  analysisModel: string | null;
  interpretationModel: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCostInr: number | null;
  costMethod: "tokens" | "flat" | null;
  premium: boolean;
}

type StageProps = Record<string, string | number | boolean | undefined>;

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function sum(...values: (number | null)[]): number | null {
  const known = values.filter((v): v is number => v !== null);
  return known.length ? known.reduce((a, b) => a + b, 0) : null;
}

export async function getBetaReport(limit = 200): Promise<BetaReportRow[]> {
  const env = getEnv();
  const readings = await db.reading.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      createdAt: true,
      status: true,
      errorCode: true,
      rejectionReason: true,
      isDemo: true,
      hand: true,
      analysisConfidence: true,
      aiProvider: true,
      analysis: { select: { data: true, attempts: true, model: true } },
      interpretation: { select: { attempts: true, model: true, removedCount: true } },
      entitlements: { where: { revokedAt: null }, select: { id: true } },
    },
  });
  const events = await db.usageEvent.findMany({
    where: { name: "ai_stage_completed", readingId: { in: readings.map((r) => r.id) } },
    orderBy: { createdAt: "asc" },
    select: { readingId: true, properties: true },
  });
  const stages = new Map<string, { analysis?: StageProps; interpretation?: StageProps }>();
  for (const e of events) {
    const props = (e.properties ?? {}) as StageProps;
    const entry = stages.get(e.readingId!) ?? {};
    if (props.stage === "analysis") entry.analysis = props;
    if (props.stage === "interpretation") entry.interpretation = props;
    stages.set(e.readingId!, entry);
  }

  const inputPrice = env.AI_COST_INPUT_PER_1M_TOKENS_INR;
  const outputPrice = env.AI_COST_OUTPUT_PER_1M_TOKENS_INR;

  return readings.map((r) => {
    const parsed = r.analysis ? PalmAnalysisSchema.safeParse(r.analysis.data) : null;
    const analysis = parsed?.success ? parsed.data : null;
    const selectedHand = r.hand === "LEFT" ? "left" : "right";
    const s1 = stages.get(r.id)?.analysis;
    const s2 = stages.get(r.id)?.interpretation;
    const inputTokens = sum(num(s1?.input_tok), num(s2?.input_tok));
    const outputTokens = sum(
      num(s1?.output_tok),
      num(s1?.thinking_tok),
      num(s2?.output_tok),
      num(s2?.thinking_tok),
    );

    let estimatedCostInr: number | null = null;
    let costMethod: BetaReportRow["costMethod"] = null;
    if (
      !r.isDemo &&
      inputPrice !== undefined &&
      outputPrice !== undefined &&
      inputTokens !== null
    ) {
      estimatedCostInr =
        Math.round(
          ((inputTokens * inputPrice) / 1e6 + ((outputTokens ?? 0) * outputPrice) / 1e6) * 100,
        ) / 100;
      costMethod = "tokens";
    } else if (!r.isDemo && r.status === "COMPLETE") {
      estimatedCostInr = env.ESTIMATED_BASIC_AI_COST_INR;
      costMethod = "flat";
    }

    const analysisAttempts = r.analysis?.attempts ?? null;
    const interpretationAttempts = r.interpretation?.attempts ?? null;
    const stage1Ms = num(s1?.total_ms);
    const stage2Ms = num(s2?.total_ms);
    return {
      readingId: r.id,
      createdAt: r.createdAt.toISOString(),
      status: r.status,
      errorCode: r.errorCode,
      rejectionReason: r.rejectionReason,
      isDemo: r.isDemo,
      selectedHand,
      detectedHand: analysis?.hand ?? null,
      detectedHandConfidence: analysis?.handConfidence ?? null,
      handMismatch: analysis ? analysis.hand !== "unknown" && analysis.hand !== selectedHand : null,
      analysisConfidence: r.analysisConfidence,
      stage1Ms,
      stage2Ms,
      totalMs: stage1Ms !== null && stage2Ms !== null ? stage1Ms + stage2Ms : null,
      analysisAttempts,
      interpretationAttempts,
      retries:
        Math.max(0, (analysisAttempts ?? 1) - 1) + Math.max(0, (interpretationAttempts ?? 1) - 1),
      filteredItems: r.interpretation?.removedCount ?? null,
      provider: r.aiProvider,
      analysisModel: r.analysis?.model ?? null,
      interpretationModel: r.interpretation?.model ?? null,
      inputTokens,
      outputTokens,
      estimatedCostInr,
      costMethod,
      premium: r.entitlements.length > 0,
    };
  });
}

const CSV_COLUMNS: (keyof BetaReportRow)[] = [
  "readingId",
  "createdAt",
  "status",
  "errorCode",
  "selectedHand",
  "detectedHand",
  "detectedHandConfidence",
  "handMismatch",
  "analysisConfidence",
  "stage1Ms",
  "stage2Ms",
  "totalMs",
  "analysisAttempts",
  "interpretationAttempts",
  "retries",
  "filteredItems",
  "provider",
  "analysisModel",
  "interpretationModel",
  "inputTokens",
  "outputTokens",
  "estimatedCostInr",
  "costMethod",
  "isDemo",
  "premium",
  "rejectionReason",
];

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  // Neutralise spreadsheet formulas.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function betaReportCsv(rows: BetaReportRow[]): string {
  const lines = [CSV_COLUMNS.join(",")];
  for (const row of rows) lines.push(CSV_COLUMNS.map((c) => csvCell(row[c])).join(","));
  return lines.join("\n") + "\n";
}
