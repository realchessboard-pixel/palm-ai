import "server-only";
import { z } from "zod";
import { getAiProvider, interpretationModel, premiumModel, premiumThinking } from "@/lib/ai";
import type { Chart } from "@/lib/astro/chart";
import { BirthSchema, chartFacts } from "@/lib/kundli/service";
import { generateStructured } from "@/lib/ai/structured";
import { trackServerEvent } from "@/lib/analytics/server";
import type { Actor } from "@/lib/auth/actor";
import { getEnv } from "@/lib/config/env";
import { db } from "@/lib/db";
import { AppError } from "@/lib/http/errors";
import { logger } from "@/lib/logger";
import { availableFeatures } from "@/lib/palmistry/features";
import { stageMetrics } from "@/lib/perf/timing";
import { sanitizeText } from "@/lib/pipeline/safety";
import {
  getOwnedReading,
  parseStoredAnalysis,
  parseStoredInterpretation,
} from "@/lib/readings/service";
import { getOwnedReaderChat } from "./access";
import { getReader, type Reader } from "./catalog";
import { readerContext, readerPrompt, readerSystemPrompt } from "./prompt";

/**
 * A visitor's first chat about one of their own readings comes with one free
 * question (tied to a completed reading, so it can't be farmed with new cookies).
 */
export const FREE_FIRST_QUESTIONS = 1;
export const MAX_QUESTION_LENGTH = 600;
const HISTORY_MESSAGES = 12;

const FALLBACK_ANSWER =
  "That's something palmistry can't really speak to, so I'd rather not guess. Ask me about your lines, your parvats, or how your palm reads your nature, and I'll gladly look.";

export interface ReaderChatView {
  id: string;
  readerId: string;
  readingId: string | null;
  questionsLeft: number;
  questionsUsed: number;
  messages: { id: string; role: "USER" | "READER"; text: string; createdAt: string }[];
}

/** Start (or reopen) a chat with a reader, optionally about one of the visitor's readings. */
export async function startReaderChat(
  input: { readerId: string; readingId?: string; guestKeyHash: string | null },
  actor: Actor,
): Promise<{ chatId: string }> {
  const reader = getReader(input.readerId);
  if (!reader) throw new AppError("NOT_FOUND");
  const reading = input.readingId ? await getOwnedReading(input.readingId, actor) : null;
  if (reading && (reading.status !== "COMPLETE" || reading.role !== "SELF")) {
    throw new AppError("CONFLICT", { message: "Your reading isn't ready yet." });
  }
  const owner = actor.user
    ? { userId: actor.user.id, guestKeyHash: null }
    : { userId: null, guestKeyHash: input.guestKeyHash };

  // Reopen the visitor's existing chat with this reader about the same reading.
  const existing = await db.readerChat.findFirst({
    where: { ...owner, readerId: reader.id, readingId: reading?.id ?? null },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return { chatId: existing.id };

  const freeAlreadyUsed = await db.readerChat.count({
    where: { ...owner, readingId: { not: null } },
  });
  const chat = await db.readerChat.create({
    data: {
      ...owner,
      readerId: reader.id,
      readingId: reading?.id ?? null,
      questionsAllowed: reading && freeAlreadyUsed === 0 ? FREE_FIRST_QUESTIONS : 0,
      messages: { create: { role: "READER", text: reader.greeting } },
    },
  });
  return { chatId: chat.id };
}

export async function getReaderChatView(id: string, actor: Actor): Promise<ReaderChatView> {
  const chat = await getOwnedReaderChat(id, actor);
  const messages = await db.readerMessage.findMany({
    where: { chatId: chat.id },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  return {
    id: chat.id,
    readerId: chat.readerId,
    readingId: chat.readingId,
    questionsLeft: Math.max(0, chat.questionsAllowed - chat.questionsUsed),
    questionsUsed: chat.questionsUsed,
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      text: m.text,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

/** Chats the visitor has open, newest first. */
export async function listReaderChats(actor: Actor) {
  if (!actor.user && !actor.guestKeyHash) return [];
  const chats = await db.readerChat.findMany({
    where: actor.user ? { userId: actor.user.id } : { guestKeyHash: actor.guestKeyHash },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });
  return chats.map((c) => ({
    id: c.id,
    readerId: c.readerId,
    questionsLeft: Math.max(0, c.questionsAllowed - c.questionsUsed),
    updatedAt: c.updatedAt.toISOString(),
  }));
}

/**
 * Ask a question. One paid (or free) question is reserved atomically before
 * the answer is written and given back if writing fails, so a question is
 * never charged without an answer, and never answered twice for one charge.
 */
export async function askReader(
  chatId: string,
  question: string,
  actor: Actor,
): Promise<{ answer: string; questionsLeft: number }> {
  const chat = await getOwnedReaderChat(chatId, actor);
  const reader = getReader(chat.readerId);
  if (!reader) throw new AppError("NOT_FOUND");
  const text = question.trim();
  if (!text) throw new AppError("VALIDATION_ERROR", { message: "Please type your question." });

  const reserved = await db.readerChat.updateMany({
    where: { id: chat.id, questionsUsed: { lt: chat.questionsAllowed } },
    data: { questionsUsed: { increment: 1 } },
  });
  // Re-check against the live row (questionsAllowed may have grown since we read it).
  if (reserved.count === 0) {
    const live = await db.readerChat.findUniqueOrThrow({ where: { id: chat.id } });
    const retry =
      live.questionsUsed < live.questionsAllowed
        ? await db.readerChat.updateMany({
            where: { id: chat.id, questionsUsed: live.questionsUsed },
            data: { questionsUsed: { increment: 1 } },
          })
        : { count: 0 };
    if (retry.count === 0) {
      throw new AppError("PAYMENT_ERROR", {
        message: `Choose a plan to ask ${reader.name} your question.`,
      });
    }
  }

  const userMessage = await db.readerMessage.create({
    data: { chatId: chat.id, role: "USER", text },
  });
  try {
    const answer = await writeAnswer(chat, reader, text);
    await db.$transaction([
      db.readerMessage.create({ data: { chatId: chat.id, role: "READER", text: answer } }),
      db.readerChat.update({ where: { id: chat.id }, data: { updatedAt: new Date() } }),
    ]);
    const live = await db.readerChat.findUniqueOrThrow({ where: { id: chat.id } });
    return { answer, questionsLeft: Math.max(0, live.questionsAllowed - live.questionsUsed) };
  } catch (error) {
    // Give the question back; the visitor can simply ask again.
    await db.readerMessage.delete({ where: { id: userMessage.id } }).catch(() => undefined);
    await db.readerChat
      .update({ where: { id: chat.id }, data: { questionsUsed: { decrement: 1 } } })
      .catch(() => undefined);
    logger.error("reader_answer_failed", { chatId: chat.id, error });
    throw new AppError(error instanceof AppError ? error.code : "AI_UNAVAILABLE", {
      message: `${reader.name} couldn't answer just now. Your question wasn't used — please ask again.`,
      internal: error,
    });
  }
}

async function writeAnswer(
  chat: {
    id: string;
    readingId: string | null;
    userId: string | null;
    guestKeyHash: string | null;
  },
  reader: Reader,
  question: string,
): Promise<string> {
  // Paid conversations get the deeper treatment: stronger model, deeper
  // thinking, longer chart-specific answers. Free questions stay short and cheap.
  const paid = (await db.payment.count({ where: { readerChatId: chat.id, status: "PAID" } })) > 0;
  const kundli = await db.kundliProfile.findFirst({
    where: chat.userId ? { userId: chat.userId } : { guestKeyHash: chat.guestKeyHash ?? "-" },
    orderBy: { createdAt: "desc" },
  });
  const reading = chat.readingId
    ? await db.reading.findUnique({
        where: { id: chat.readingId },
        include: { analysis: true, interpretation: true },
      })
    : null;
  const analysis = reading?.analysis ? parseStoredAnalysis(reading.analysis.data) : null;
  const interpretation = reading?.interpretation
    ? parseStoredInterpretation(reading.interpretation.data)
    : null;
  const history = await db.readerMessage.findMany({
    where: { chatId: chat.id },
    orderBy: { createdAt: "desc" },
    take: HISTORY_MESSAGES + 1,
  });
  // The newest message is the question itself.
  const earlier = history.slice(1).reverse();

  const provider = getAiProvider();
  if (provider.isMock || reading?.isDemo) {
    const n = interpretation?.narrative;
    return n?.thinking
      ? `Looking at your palm again: ${n.thinking.text.split(/\n\n/)[0]} (Demo mode — this answer comes from your sample reading, not a live AI reader.)`
      : "This is demo mode, so I can't write a live answer — but take your free palm reading and ask me again. (Demo mode)";
  }

  const env = getEnv();
  const started = performance.now();
  const result = await generateStructured({
    provider,
    task: "reader_answer",
    model: paid ? premiumModel(provider) : interpretationModel(provider),
    system: readerSystemPrompt(reader, paid),
    prompt: readerPrompt({
      context: `${readerContext({
        analysis,
        interpretation,
        available: analysis ? availableFeatures(analysis) : null,
      })}${
        kundli
          ? `\n\nTHE VISITOR'S KUNDLI (sidereal, Lahiri; birth details: ${BirthSchema.parse(kundli.birth).placeName}):\n${chartFacts(kundli.chart as unknown as Chart, BirthSchema.parse(kundli.birth).timeKnown)}`
          : ""
      }`,
      history: earlier.map((m) => ({ role: m.role, text: m.text })),
      question,
    }),
    schema: z.object({ answer: z.string().min(1).max(3000) }),
    maxTokens: paid ? 12000 : 1500,
    timeoutMs: env.AI_TIMEOUT_MS,
    maxAttempts: env.AI_MAX_ATTEMPTS,
    thinking: paid ? premiumThinking() : "low",
  });
  const safe = sanitizeText(result.data.answer).text;
  await trackServerEvent("ai_stage_completed", {
    userId: chat.userId,
    readingId: chat.readingId,
    properties: stageMetrics({
      stage: "reader",
      totalMs: performance.now() - started,
      providerMs: result.providerMs,
      attempts: result.attempts,
      provider: provider.name,
      model: result.model,
      usage: result.usage,
    }),
  });
  return safe.length >= 20 ? safe : FALLBACK_ANSWER;
}
