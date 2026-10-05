import "server-only";
import { randomInt } from "node:crypto";
import type { LedgerUnit, Payment, Prisma, ProductKind } from "@prisma/client";
import { z } from "zod";
import type { Actor } from "@/lib/auth/actor";
import { grantReadingPremium, hasPremiumAccess } from "@/lib/entitlements";
import { AppError } from "@/lib/http/errors";
import { getOwnedReading } from "@/lib/readings/service";
import { IdSchema } from "@/lib/schemas/api";
import {
  FAMILY_PACK_CREDITS,
  GIFT_VALID_DAYS,
  MEMBERSHIP_DAYS,
  PRODUCTS,
  WALLET_TOPUPS,
  formatInr,
  readerPlan,
  toPaise,
  walletTopup,
} from "./price";
import { getOwnedReaderChat } from "@/lib/readers/access";
import { getReader } from "@/lib/readers/catalog";
import { getOwnedCompatibility, hasCompatibilityAccess } from "./compatibility-access";

/** What a visitor can buy. Prices are never taken from the request. */
export const OrderSchema = z.discriminatedUnion("product", [
  z.object({ product: z.literal("DETAILED_READING"), readingId: IdSchema }),
  z.object({ product: z.literal("COUPLE_COMPATIBILITY"), compatibilityId: IdSchema }),
  z.object({ product: z.literal("FAMILY_PACK") }),
  z.object({ product: z.literal("GIFT_READING") }),
  z.object({ product: z.literal("MEMBERSHIP_YEAR") }),
  z.object({
    product: z.literal("READER_QUESTIONS"),
    chatId: IdSchema,
    plan: z.enum(["single", "bundle"]),
  }),
  z.object({
    product: z.literal("WALLET_TOPUP"),
    payInr: z.union(WALLET_TOPUPS.map((t) => z.literal(t.payInr)) as never),
  }),
]);
export type Order = z.infer<typeof OrderSchema>;

export interface PreparedOrder {
  product: ProductKind;
  amountPaise: number;
  userId: string | null;
  readingId: string | null;
  compatibilityId: string | null;
  readerChatId: string | null;
  /** Units bought (questions for a reader chat; 1 otherwise). */
  quantity: number;
  description: string;
  /** Where the buyer returns after checkout. */
  returnPath: string;
  /** Already bought (e.g. the reading is unlocked): nothing to charge. */
  alreadyOwned: boolean;
}

function requireAccount(actor: Actor): string {
  if (!actor.user) {
    throw new AppError("UNAUTHORIZED", {
      message: "Please sign in (it's free) so your purchase is saved to your account.",
    });
  }
  return actor.user.id;
}

/** Validate an order for this actor and price it from the catalogue. */
export async function prepareOrder(order: Order, actor: Actor): Promise<PreparedOrder> {
  const base = {
    readingId: null,
    compatibilityId: null,
    readerChatId: null,
    quantity: 1,
    alreadyOwned: false,
  };
  switch (order.product) {
    case "DETAILED_READING": {
      const reading = await getOwnedReading(order.readingId, actor);
      if (reading.status !== "COMPLETE") {
        throw new AppError("CONFLICT", { message: "This reading isn't ready yet." });
      }
      return {
        ...base,
        product: order.product,
        amountPaise: toPaise(PRODUCTS.DETAILED_READING.priceInr),
        userId: reading.userId,
        readingId: reading.id,
        description: PRODUCTS.DETAILED_READING.name,
        returnPath: `/readings/${reading.id}`,
        alreadyOwned: await hasPremiumAccess({
          readingId: reading.id,
          ownerUserId: reading.userId,
        }),
      };
    }
    case "COUPLE_COMPATIBILITY": {
      const compatibility = await getOwnedCompatibility(order.compatibilityId, actor);
      return {
        ...base,
        product: order.product,
        amountPaise: toPaise(PRODUCTS.COUPLE_COMPATIBILITY.priceInr),
        userId: compatibility.userId,
        compatibilityId: compatibility.id,
        description: PRODUCTS.COUPLE_COMPATIBILITY.name,
        returnPath: `/compatibility/${compatibility.id}`,
        alreadyOwned: await hasCompatibilityAccess(compatibility.id),
      };
    }
    case "FAMILY_PACK":
    case "GIFT_READING":
    case "MEMBERSHIP_YEAR":
      return {
        ...base,
        product: order.product,
        amountPaise: toPaise(PRODUCTS[order.product].priceInr),
        userId: requireAccount(actor),
        description: PRODUCTS[order.product].name,
        returnPath: "/account",
      };
    case "READER_QUESTIONS": {
      const chat = await getOwnedReaderChat(order.chatId, actor);
      const reader = getReader(chat.readerId);
      if (!reader) throw new AppError("NOT_FOUND");
      const plan = readerPlan(reader.tier, order.plan);
      return {
        ...base,
        product: order.product,
        amountPaise: toPaise(plan.priceInr),
        userId: chat.userId,
        readerChatId: chat.id,
        quantity: plan.questions,
        description: `${plan.questions} question${plan.questions === 1 ? "" : "s"} for ${reader.name} (AI reader)`,
        returnPath: `/chat/${chat.id}`,
      };
    }
    case "WALLET_TOPUP": {
      const topup = walletTopup(order.payInr);
      if (!topup) throw new AppError("VALIDATION_ERROR");
      return {
        ...base,
        product: order.product,
        amountPaise: toPaise(topup.payInr),
        userId: requireAccount(actor),
        description: `PalmAI wallet: pay ${formatInr(topup.payInr)}, get ${formatInr(topup.creditInr)}`,
        returnPath: "/account",
      };
    }
  }
}

/**
 * Record a balance change once. Each grant has a unique (unit, reason, refId),
 * so a replayed webhook or a double click can never credit twice.
 */
export async function addToLedger(
  tx: Prisma.TransactionClient,
  entry: { userId: string; unit: LedgerUnit; delta: number; reason: string; refId: string },
): Promise<boolean> {
  const { count } = await tx.ledgerEntry.createMany({ data: [entry], skipDuplicates: true });
  if (count === 0) return false;
  await tx.user.update({
    where: { id: entry.userId },
    data:
      entry.unit === "WALLET_PAISE"
        ? { walletBalance: { increment: entry.delta } }
        : { readingCredits: { increment: entry.delta } },
  });
  return true;
}

const GIFT_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function newGiftCode(): string {
  const pick = () =>
    Array.from({ length: 5 }, () => GIFT_ALPHABET[randomInt(GIFT_ALPHABET.length)]).join("");
  return `${pick()}-${pick()}`;
}

const DAY = 24 * 60 * 60 * 1000;

/** Deliver what a paid order bought. Idempotent per payment. */
export async function grantOrder(tx: Prisma.TransactionClient, payment: Payment): Promise<void> {
  switch (payment.product) {
    case "DETAILED_READING":
      if (payment.readingId) {
        await grantReadingPremium(tx, {
          readingId: payment.readingId,
          userId: payment.userId,
          paymentId: payment.id,
        });
      }
      return;
    case "COUPLE_COMPATIBILITY":
      if (payment.compatibilityId) {
        await tx.entitlement.upsert({
          where: { paymentId: payment.id },
          create: {
            type: "COMPATIBILITY",
            compatibilityId: payment.compatibilityId,
            userId: payment.userId,
            paymentId: payment.id,
          },
          update: {},
        });
      }
      return;
    case "FAMILY_PACK":
      if (payment.userId) {
        await addToLedger(tx, {
          userId: payment.userId,
          unit: "READING_CREDIT",
          delta: FAMILY_PACK_CREDITS,
          reason: "family_pack",
          refId: payment.id,
        });
      }
      return;
    case "GIFT_READING":
      await tx.giftCode.upsert({
        where: { paymentId: payment.id },
        create: {
          code: newGiftCode(),
          purchaserId: payment.userId,
          paymentId: payment.id,
          expiresAt: new Date(Date.now() + GIFT_VALID_DAYS * DAY),
        },
        update: {},
      });
      return;
    case "MEMBERSHIP_YEAR": {
      if (!payment.userId) return;
      const existing = await tx.entitlement.findUnique({ where: { paymentId: payment.id } });
      if (existing) return;
      // Renewing early extends the current membership rather than overlapping it.
      const current = await tx.entitlement.findFirst({
        where: { type: "PREMIUM_SUBSCRIPTION", userId: payment.userId, revokedAt: null },
        orderBy: { expiresAt: "desc" },
      });
      const from = Math.max(Date.now(), current?.expiresAt?.getTime() ?? 0);
      await tx.entitlement.create({
        data: {
          type: "PREMIUM_SUBSCRIPTION",
          userId: payment.userId,
          paymentId: payment.id,
          expiresAt: new Date(from + MEMBERSHIP_DAYS * DAY),
        },
      });
      return;
    }
    case "READER_QUESTIONS":
      // Runs once per payment: callers only grant on the PENDING → PAID transition.
      if (payment.readerChatId) {
        await tx.readerChat.update({
          where: { id: payment.readerChatId },
          data: { questionsAllowed: { increment: payment.quantity } },
        });
      }
      return;
    case "WALLET_TOPUP": {
      const topup = walletTopup(payment.amount / 100);
      if (payment.userId && topup) {
        await addToLedger(tx, {
          userId: payment.userId,
          unit: "WALLET_PAISE",
          delta: toPaise(topup.creditInr),
          reason: "wallet_topup",
          refId: payment.id,
        });
      }
      return;
    }
  }
}

/** Who may continue, settle or cancel a payment: the owner of what it buys. */
export async function assertPaymentOwner(
  payment: Pick<Payment, "readingId" | "compatibilityId" | "readerChatId" | "userId">,
  actor: Actor,
): Promise<void> {
  if (payment.readingId) {
    await getOwnedReading(payment.readingId, actor);
  } else if (payment.compatibilityId) {
    await getOwnedCompatibility(payment.compatibilityId, actor);
  } else if (payment.readerChatId) {
    await getOwnedReaderChat(payment.readerChatId, actor);
  } else if (!payment.userId || actor.user?.id !== payment.userId) {
    throw new AppError("NOT_FOUND");
  }
}

export function returnPathFor(
  payment: Pick<Payment, "readingId" | "compatibilityId" | "readerChatId">,
): string {
  if (payment.readingId) return `/readings/${payment.readingId}`;
  if (payment.compatibilityId) return `/compatibility/${payment.compatibilityId}`;
  if (payment.readerChatId) return `/chat/${payment.readerChatId}`;
  return "/account";
}
