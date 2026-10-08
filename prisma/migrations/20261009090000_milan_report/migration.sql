-- AlterEnum
ALTER TYPE "ProductKind" ADD VALUE 'MILAN_REPORT';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "milanId" TEXT;

-- CreateTable
CREATE TABLE "MilanProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "guestKeyHash" TEXT,
    "nameA" TEXT NOT NULL,
    "nameB" TEXT NOT NULL,
    "birthA" JSONB NOT NULL,
    "birthB" JSONB NOT NULL,
    "chartA" JSONB NOT NULL,
    "chartB" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "reportStatus" "KundliReportStatus" NOT NULL DEFAULT 'NONE',
    "report" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MilanProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MilanProfile_userId_idx" ON "MilanProfile"("userId");

-- CreateIndex
CREATE INDEX "MilanProfile_guestKeyHash_idx" ON "MilanProfile"("guestKeyHash");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_milanId_fkey" FOREIGN KEY ("milanId") REFERENCES "MilanProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilanProfile" ADD CONSTRAINT "MilanProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

