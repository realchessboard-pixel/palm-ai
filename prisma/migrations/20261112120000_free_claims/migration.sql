-- CreateTable
CREATE TABLE "FreeClaim" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FreeClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FreeClaim_service_keyHash_key" ON "FreeClaim"("service", "keyHash");
