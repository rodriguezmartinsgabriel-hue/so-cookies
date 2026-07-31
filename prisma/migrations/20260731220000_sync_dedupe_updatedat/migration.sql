-- AlterTable
ALTER TABLE "CashFlow" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "CashFlow" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "DeliveryCost" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "DeliveryCost" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Sale" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "SyncApply" (
    "id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "tempId" TEXT NOT NULL,
    "realId" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncApply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SyncApply_appliedAt_idx" ON "SyncApply"("appliedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SyncApply_entity_tempId_key" ON "SyncApply"("entity", "tempId");

-- CreateIndex
CREATE INDEX "CashFlow_updatedAt_idx" ON "CashFlow"("updatedAt");

-- CreateIndex
CREATE INDEX "DeliveryCost_date_idx" ON "DeliveryCost"("date");

-- CreateIndex
CREATE INDEX "DeliveryCost_updatedAt_idx" ON "DeliveryCost"("updatedAt");

-- CreateIndex
CREATE INDEX "Sale_updatedAt_idx" ON "Sale"("updatedAt");
