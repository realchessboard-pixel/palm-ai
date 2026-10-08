import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as analyze } from "@/app/api/palm/analyze/route";
import { POST as interpret } from "@/app/api/palm/interpret/route";
import { POST as checkout } from "@/app/api/payments/checkout/route";
import { POST as mockComplete } from "@/app/api/payments/mock/complete/route";
import { POST as ask } from "@/app/api/readers/chats/[id]/messages/route";
import { POST as startChat } from "@/app/api/readers/chats/route";
import { setAiProvider } from "@/lib/ai";
import { getActorFromRequest } from "@/lib/auth/actor";
import { resetEnvCache } from "@/lib/config/env";
import { db } from "@/lib/db";
import { READER_TIERS } from "@/lib/monetization/price";
import { composeRuleBasedReading } from "@/lib/palmistry/interpretation";
import { sampleAnalysis } from "@/lib/palmistry/sample-analysis";
import { resetIdempotencyCache } from "@/lib/pipeline/idempotency";
import { getReader } from "@/lib/readers/catalog";
import { getReaderChatView } from "@/lib/readers/service";
import { ScriptedProvider, teaserJson } from "../helpers/ai";
import { hasTestDatabase, resetDatabase } from "../helpers/db";
import { CookieJar, json, makeRequest, params } from "../helpers/http";
import { palmLikeImage } from "../helpers/images";

const ctx = { params: Promise.resolve({}) };

function setEnv(values: Record<string, string>) {
  Object.assign(process.env, values);
  resetEnvCache();
}

const answer = (text: string) => () => JSON.stringify({ answer: text });

async function completedReading(jar: CookieJar) {
  const form = new FormData();
  form.set(
    "image",
    new Blob([new Uint8Array(await palmLikeImage())], { type: "image/jpeg" }),
    "p.jpg",
  );
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

async function open(jar: CookieJar, readerId: string, readingId?: string) {
  const res = await startChat(
    makeRequest("/api/readers/chats", { json: { readerId, readingId }, jar }),
    ctx,
  );
  jar.absorb(res);
  return { status: res.status, ...(await json<{ chatId: string }>(res)) };
}

function question(jar: CookieJar, chatId: string, text: string) {
  return ask(
    makeRequest(`/api/readers/chats/${chatId}/messages`, { json: { text }, jar }),
    params({ id: chatId }),
  );
}

async function buy(jar: CookieJar, chatId: string, plan: "single" | "bundle") {
  const res = await checkout(
    makeRequest("/api/payments/checkout", {
      json: { product: "READER_QUESTIONS", chatId, plan },
      jar,
    }),
    ctx,
  );
  const { url } = await json<{ url: string }>(res);
  const paymentId = url.split("/checkout/sandbox/")[1]!;
  return mockComplete(
    makeRequest("/api/payments/mock/complete", { json: { paymentId, outcome: "success" }, jar }),
    ctx,
  );
}

async function view(jar: CookieJar, chatId: string) {
  return getReaderChatView(chatId, await getActorFromRequest(makeRequest("/", { jar })));
}

describe.skipIf(!hasTestDatabase)("Ask a Reader", () => {
  let provider: ScriptedProvider;
  beforeEach(async () => {
    await resetDatabase();
    resetIdempotencyCache();
    setEnv({ PAYMENT_PROVIDER: "mock", NODE_ENV: "test", DEMO_MODE: "false" });
    provider = new ScriptedProvider([
      JSON.stringify(sampleAnalysis("right")),
      teaserJson(composeRuleBasedReading(sampleAnalysis("right")).narrative!),
    ]);
    setAiProvider(provider);
  });
  afterEach(() => setAiProvider(undefined));

  it("greets, answers one free question about the palm, then asks to choose a plan", async () => {
    const jar = new CookieJar();
    const readingId = await completedReading(jar);
    const { status, chatId } = await open(jar, "meera", readingId);
    expect(status).toBe(201);
    expect((await view(jar, chatId)).messages[0]).toMatchObject({
      role: "READER",
      text: getReader("meera")!.greeting,
    });

    (provider as unknown as { script: unknown[] }).script.push(
      answer(
        "Your Hridaya Rekha curves gently upward, which tradition reads as an open, warm heart.",
      ),
    );
    const first = await question(jar, chatId, "What does my heart line say about me?");
    expect(first.status).toBe(200);
    expect(await json(first)).toMatchObject({ questionsLeft: 0 });
    const prompt = provider.requests.at(-1)!;
    expect(prompt.task).toBe("reader_answer");
    expect(prompt.system).toContain('"Meera"');
    expect(prompt.system).toMatch(/Never claim or imply that you are a human/);
    expect(prompt.prompt).toContain("OBSERVED FEATURES");

    expect((await question(jar, chatId, "And my career?")).status).toBe(402);
    expect((await view(jar, chatId)).messages).toHaveLength(3);
  });

  it("sells questions at the reader's tier price, and each paid question is answered once", async () => {
    const jar = new CookieJar();
    const readingId = await completedReading(jar);
    await open(jar, "ananya", readingId); // uses the one free question offer
    const { chatId } = await open(jar, "acharya-dev", readingId);
    expect((await view(jar, chatId)).questionsLeft).toBe(0);

    expect((await buy(jar, chatId, "bundle")).status).toBe(200);
    const payment = await db.payment.findFirstOrThrow({ where: { readerChatId: chatId } });
    expect(payment).toMatchObject({
      product: "READER_QUESTIONS",
      amount: READER_TIERS.master.bundle.priceInr * 100,
      quantity: READER_TIERS.master.bundle.questions,
    });
    expect((await view(jar, chatId)).questionsLeft).toBe(READER_TIERS.master.bundle.questions);

    // A failed answer gives the question back.
    (provider as unknown as { script: unknown[] }).script.push(
      new Error("boom"),
      answer("Traditionally your Guru Parvat speaks of a wish to lead. You will marry in 2027."),
    );
    const failed = await question(jar, chatId, "Will I lead?");
    expect(failed.status).toBeGreaterThanOrEqual(500);
    expect(JSON.stringify(await json(failed))).toContain("Your question wasn't used");
    expect((await view(jar, chatId)).questionsLeft).toBe(10);
    const ok = await question(jar, chatId, "Will I lead?");
    expect(ok.status).toBe(200);
    const body = await json<{ answer: string; questionsLeft: number }>(ok);
    expect(body.questionsLeft).toBe(9);
    // Predictions are removed before anything is saved.
    expect(body.answer).toContain("Guru Parvat");
    expect(body.answer).not.toMatch(/marry|2027/);
  });

  it("keeps chats private and gives no free question without a reading", async () => {
    const owner = new CookieJar();
    const readingId = await completedReading(owner);
    const { chatId } = await open(owner, "kabir", readingId);

    const stranger = new CookieJar();
    expect((await question(stranger, chatId, "hi")).status).toBe(404);
    const strangersChat = await open(stranger, "kabir");
    expect(strangersChat.status).toBe(201);
    expect((await view(stranger, strangersChat.chatId)).questionsLeft).toBe(0);
    // Someone else's reading can't be attached.
    expect((await open(stranger, "kabir", readingId)).status).toBe(404);
  });
});
