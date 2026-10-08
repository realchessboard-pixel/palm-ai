import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET as betaCsv } from "@/app/api/admin/beta-report/route";
import { POST as signup } from "@/app/api/auth/signup/route";
import { POST as analyze } from "@/app/api/palm/analyze/route";
import { POST as interpret } from "@/app/api/palm/interpret/route";
import { betaReportCsv, getBetaReport, type BetaReportRow } from "@/lib/admin/beta-report";
import { setAiProvider } from "@/lib/ai";
import { resetEnvCache } from "@/lib/config/env";
import { composeRuleBasedReading } from "@/lib/palmistry/interpretation";
import { sampleAnalysis } from "@/lib/palmistry/sample-analysis";
import { ScriptedProvider, teaserJson } from "../helpers/ai";
import { hasTestDatabase, resetDatabase } from "../helpers/db";
import { CookieJar, json, makeRequest } from "../helpers/http";
import { palmLikeImage } from "../helpers/images";

const ctx = { params: Promise.resolve({}) };

async function reading(jar: CookieJar, hand: "left" | "right") {
  const form = new FormData();
  form.set(
    "image",
    new Blob([new Uint8Array(await palmLikeImage())], { type: "image/jpeg" }),
    "p.jpg",
  );
  form.set("hand", hand);
  form.set("consent", "true");
  const res = await analyze(
    makeRequest("/api/palm/analyze", { method: "POST", body: form, jar }),
    ctx,
  );
  jar.absorb(res);
  const { readingId } = await json<{ readingId: string }>(res);
  await interpret(makeRequest("/api/palm/interpret", { json: { readingId }, jar }), ctx);
  return readingId;
}

async function account(email: string) {
  const jar = new CookieJar();
  jar.absorb(
    await signup(
      makeRequest("/api/auth/signup", { json: { email, password: "a long password" }, jar }),
      ctx,
    ),
  );
  return jar;
}

describe.skipIf(!hasTestDatabase)("internal beta report", () => {
  beforeEach(async () => {
    await resetDatabase();
  });
  afterEach(() => {
    setAiProvider(undefined);
    delete process.env.AI_COST_INPUT_PER_1M_TOKENS_INR;
    delete process.env.AI_COST_OUTPUT_PER_1M_TOKENS_INR;
    resetEnvCache();
  });

  it("records hands, confidence, stage timings, retries, model and cost per reading", async () => {
    // PalmAI reads the right hand; the model says LEFT (0.9) and needs one retry in stage 1.
    setAiProvider(
      new ScriptedProvider(
        [
          "not json",
          JSON.stringify({ ...sampleAnalysis("right"), hand: "left", handConfidence: 0.9 }),
          teaserJson(composeRuleBasedReading(sampleAnalysis("right")).narrative!),
        ],
        { inputTokens: 4600, imageTokens: 1064, outputTokens: 1300, thinkingTokens: 1000 },
      ),
    );
    const id = await reading(new CookieJar(), "right");

    const [row] = await getBetaReport();
    expect(row).toMatchObject<Partial<BetaReportRow>>({
      readingId: id,
      status: "COMPLETE",
      selectedHand: "right",
      detectedHand: "left",
      detectedHandConfidence: 0.9,
      handMismatch: true,
      analysisAttempts: 2,
      interpretationAttempts: 1,
      retries: 1,
      filteredItems: 0,
      provider: "anthropic", // the scripted test provider's name
      analysisModel: "test-model",
      interpretationModel: "test-model",
      // 2 stage-1 attempts + 1 stage-2 attempt, 4600 input each; output includes thinking.
      inputTokens: 13_800,
      outputTokens: 6_900,
      costMethod: "flat",
      estimatedCostInr: 4,
      isDemo: false,
      premium: false,
    });
    expect(row!.stage1Ms).toBeGreaterThan(0);
    expect(row!.stage2Ms).toBeGreaterThanOrEqual(0);
    expect(row!.totalMs).toBe(row!.stage1Ms! + row!.stage2Ms!);
  });

  it("uses token prices for the cost estimate when they are configured", async () => {
    process.env.AI_COST_INPUT_PER_1M_TOKENS_INR = "25";
    process.env.AI_COST_OUTPUT_PER_1M_TOKENS_INR = "250";
    resetEnvCache();
    setAiProvider(
      new ScriptedProvider(
        [
          JSON.stringify(sampleAnalysis("right")),
          teaserJson(composeRuleBasedReading(sampleAnalysis("right")).narrative!),
        ],
        { inputTokens: 5000, outputTokens: 2000, thinkingTokens: 2000 },
      ),
    );
    await reading(new CookieJar(), "right");
    const [row] = await getBetaReport();
    // (10,000 × 25 + 8,000 × 250) / 1M = 0.25 + 2.00
    expect(row).toMatchObject({
      estimatedCostInr: 2.25,
      costMethod: "tokens",
      handMismatch: false,
    });
  });

  it("marks demo (mock AI) readings and gives them no AI cost", async () => {
    await reading(new CookieJar(), "right");
    const [row] = await getBetaReport();
    expect(row).toMatchObject({ isDemo: true, estimatedCostInr: null, provider: "mock" });
  });

  it("exports CSV for admins only, with spreadsheet-safe cells", async () => {
    await reading(new CookieJar(), "right");
    expect((await betaCsv(makeRequest("/api/admin/beta-report"), ctx)).status).toBe(401);
    const member = await account("member@example.com");
    expect(
      (await betaCsv(makeRequest("/api/admin/beta-report", { jar: member }), ctx)).status,
    ).toBe(403);

    const admin = await account("admin@example.com");
    const res = await betaCsv(makeRequest("/api/admin/beta-report", { jar: admin }), ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    const [header, first] = (await res.text()).trim().split("\n");
    expect(header).toMatch(/^readingId,createdAt,status,errorCode,selectedHand,detectedHand,/);
    expect(first).toContain(",right,");
    expect(header).not.toMatch(/email|guest|image/i);

    const csv = betaReportCsv([
      { readingId: "r1", rejectionReason: '=HYPERLINK("x"), "quoted"' } as BetaReportRow,
    ]);
    expect(csv).toContain(`"'=HYPERLINK(""x""), ""quoted"""`);
  });
});
