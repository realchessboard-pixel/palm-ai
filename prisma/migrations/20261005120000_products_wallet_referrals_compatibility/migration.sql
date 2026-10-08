-- CreateEnum
CREATE TYPE "ProductKind" AS ENUM ('DETAILED_READING', 'COUPLE_COMPATIBILITY', 'FAMILY_PACK', 'GIFT_READING', 'MEMBERSHIP_YEAR', 'WALLET_TOPUP');

-- CreateEnum
CREATE TYPE "ReadingRole" AS ENUM ('SELF', 'PARTNER');

-- CreateEnum
CREATE TYPE "LedgerUnit" AS ENUM ('WALLET_PAISE', 'READING_CREDIT');

-- CreateEnum
CREATE TYPE "CompatibilityStatus" AS ENUM ('LOCKED', 'GENERATING', 'COMPLETE', 'FAILED');

-- AlterEnum
ALTER TYPE "EntitlementType" ADD VALUE 'COMPATIBILITY';

-- AlterTable
ALTER TABLE "Entitlement" ADD COLUMN     "compatibilityId" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "compatibilityId" TEXT,
ADD COLUMN     "product" "ProductKind" NOT NULL DEFAULT 'DETAILED_READING';

-- AlterTable
ALTER TABLE "Reading" ADD COLUMN     "role" "ReadingRole" NOT NULL DEFAULT 'SELF';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "readingCredits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "referralCode" TEXT,
ADD COLUMN     "walletBalance" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "unit" "LedgerUnit" NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "purchaserId" TEXT,
    "paymentId" TEXT,
    "redeemedById" TEXT,
    "redeemedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredId" TEXT NOT NULL,
    "qualifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Compatibility" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "guestKeyHash" TEXT,
    "readingId" TEXT NOT NULL,
    "partnerReadingId" TEXT NOT NULL,
    "status" "CompatibilityStatus" NOT NULL DEFAULT 'LOCKED',
    "data" JSONB,
    "provider" TEXT,
    "model" TEXT,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Compatibility_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LedgerEntry_userId_createdAt_idx" ON "LedgerEntry"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_unit_reason_refId_key" ON "LedgerEntry"("unit", "reason", "refId");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCode_code_key" ON "GiftCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCode_paymentId_key" ON "GiftCode"("paymentId");

-- CreateIndex
CREATE INDEX "GiftCode_purchaserId_idx" ON "GiftCode"("purchaserId");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_referredId_key" ON "Referral"("referredId");

-- CreateIndex
CREATE INDEX "Referral_referrerId_qualifiedAt_idx" ON "Referral"("referrerId", "qualifiedAt");

-- CreateIndex
CREATE INDEX "Compatibility_userId_idx" ON "Compatibility"("userId");

-- CreateIndex
CREATE INDEX "Compatibility_guestKeyHash_idx" ON "Compatibility"("guestKeyHash");

-- CreateIndex
CREATE UNIQUE INDEX "Compatibility_readingId_partnerReadingId_key" ON "Compatibility"("readingId", "partnerReadingId");

-- CreateIndex
CREATE INDEX "Payment_product_status_idx" ON "Payment"("product", "status");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_compatibilityId_fkey" FOREIGN KEY ("compatibilityId") REFERENCES "Compatibility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_compatibilityId_fkey" FOREIGN KEY ("compatibilityId") REFERENCES "Compatibility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCode" ADD CONSTRAINT "GiftCode_purchaserId_fkey" FOREIGN KEY ("purchaserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCode" ADD CONSTRAINT "GiftCode_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCode" ADD CONSTRAINT "GiftCode_redeemedById_fkey" FOREIGN KEY ("redeemedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referredId_fkey" FOREIGN KEY ("referredId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compatibility" ADD CONSTRAINT "Compatibility_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compatibility" ADD CONSTRAINT "Compatibility_readingId_fkey" FOREIGN KEY ("readingId") REFERENCES "Reading"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compatibility" ADD CONSTRAINT "Compatibility_partnerReadingId_fkey" FOREIGN KEY ("partnerReadingId") REFERENCES "Reading"("id") ON DELETE CASCADE ON UPDATE CASCADE;

