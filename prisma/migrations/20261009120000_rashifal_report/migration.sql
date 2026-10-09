-- AlterEnum
ALTER TYPE "ProductKind" ADD VALUE 'RASHIFAL_REPORT';

-- AlterTable
ALTER TABLE "KundliProfile" ADD COLUMN     "yearReport" JSONB,
ADD COLUMN     "yearStatus" "KundliReportStatus" NOT NULL DEFAULT 'NONE';

