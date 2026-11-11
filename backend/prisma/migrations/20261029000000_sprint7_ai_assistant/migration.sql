-- Sprint 7: AI request usage ledger for an application-level cost budget.
-- Chat content is deliberately not stored in this table.
CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RESERVED',
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "costMicros" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AiUsage_requestId_key" ON "AiUsage"("requestId");
CREATE INDEX "AiUsage_createdAt_idx" ON "AiUsage"("createdAt");
CREATE INDEX "AiUsage_status_createdAt_idx" ON "AiUsage"("status", "createdAt");
