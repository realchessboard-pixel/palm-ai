-- CreateTable
CREATE TABLE "AdReward" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "guestKeyHash" TEXT,
    "purpose" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdReward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdReward_userId_createdAt_idx" ON "AdReward"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AdReward_guestKeyHash_createdAt_idx" ON "AdReward"("guestKeyHash", "createdAt");

