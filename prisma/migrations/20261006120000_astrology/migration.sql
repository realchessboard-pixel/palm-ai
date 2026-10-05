-- CreateEnum
CREATE TYPE "KundliReportStatus" AS ENUM ('NONE', 'GENERATING', 'COMPLETE', 'FAILED');

-- AlterEnum
ALTER TYPE "ProductKind" ADD VALUE 'KUNDLI_REPORT';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "kundliId" TEXT;

-- CreateTable
CREATE TABLE "DailyHoroscope" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "sign" INTEGER NOT NULL,
    "language" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "provider" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyHoroscope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KundliProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "guestKeyHash" TEXT,
    "name" TEXT NOT NULL,
    "birth" JSONB NOT NULL,
    "chart" JSONB NOT NULL,
    "reportStatus" "KundliReportStatus" NOT NULL DEFAULT 'NONE',
    "report" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KundliProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyHoroscope_date_sign_language_key" ON "DailyHoroscope"("date", "sign", "language");

-- CreateIndex
CREATE INDEX "KundliProfile_userId_idx" ON "KundliProfile"("userId");

-- CreateIndex
CREATE INDEX "KundliProfile_guestKeyHash_idx" ON "KundliProfile"("guestKeyHash");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_kundliId_fkey" FOREIGN KEY ("kundliId") REFERENCES "KundliProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KundliProfile" ADD CONSTRAINT "KundliProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

