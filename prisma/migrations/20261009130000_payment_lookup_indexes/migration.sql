-- CreateIndex
CREATE INDEX "Payment_compatibilityId_idx" ON "Payment"("compatibilityId");

-- CreateIndex
CREATE INDEX "Payment_milanId_idx" ON "Payment"("milanId");

-- CreateIndex
CREATE INDEX "Payment_kundliId_idx" ON "Payment"("kundliId");

-- CreateIndex
CREATE INDEX "Payment_readerChatId_idx" ON "Payment"("readerChatId");
