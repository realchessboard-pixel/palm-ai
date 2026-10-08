-- CreateEnum
CREATE TYPE "ReaderMessageRole" AS ENUM ('USER', 'READER');

-- AlterEnum
ALTER TYPE "ProductKind" ADD VALUE 'READER_QUESTIONS';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "readerChatId" TEXT;

-- CreateTable
CREATE TABLE "ReaderChat" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "guestKeyHash" TEXT,
    "readerId" TEXT NOT NULL,
    "readingId" TEXT,
    "questionsAllowed" INTEGER NOT NULL DEFAULT 0,
    "questionsUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReaderChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReaderMessage" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "role" "ReaderMessageRole" NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReaderMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReaderChat_userId_idx" ON "ReaderChat"("userId");

-- CreateIndex
CREATE INDEX "ReaderChat_guestKeyHash_idx" ON "ReaderChat"("guestKeyHash");

-- CreateIndex
CREATE INDEX "ReaderMessage_chatId_createdAt_idx" ON "ReaderMessage"("chatId", "createdAt");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_readerChatId_fkey" FOREIGN KEY ("readerChatId") REFERENCES "ReaderChat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReaderChat" ADD CONSTRAINT "ReaderChat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReaderChat" ADD CONSTRAINT "ReaderChat_readingId_fkey" FOREIGN KEY ("readingId") REFERENCES "Reading"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReaderMessage" ADD CONSTRAINT "ReaderMessage_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "ReaderChat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

