-- AlterTable
ALTER TABLE "PriceTier" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "PriceTier_updatedAt_idx" ON "PriceTier"("updatedAt");

-- Normalize production status to lowercase (canonical)
UPDATE "Production" SET "status" = lower("status") WHERE "status" <> lower("status");
