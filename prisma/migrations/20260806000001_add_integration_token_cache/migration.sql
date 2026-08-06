-- DropIndex
-- Sem índices a remover nesta migration.

-- AlterTable
ALTER TABLE "IntegrationAccount" ADD COLUMN "cachedToken" TEXT;

-- AlterTable
ALTER TABLE "IntegrationAccount" ADD COLUMN "tokenExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "IntegrationAccount_tokenExpiresAt_idx" ON "IntegrationAccount"("tokenExpiresAt");
