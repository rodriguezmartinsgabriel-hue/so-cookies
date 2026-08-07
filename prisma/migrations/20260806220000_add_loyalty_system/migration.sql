-- CreateEnum
CREATE TYPE "LoyaltyTxType" AS ENUM ('EARN', 'REDEEM', 'REFUND', 'ADJUSTMENT', 'EXPIRE');

-- CreateEnum
CREATE TYPE "LoyaltyRewardType" AS ENUM ('DISCOUNT_FIXED', 'DISCOUNT_PERCENTAGE', 'FREE_PRODUCT', 'FREE_SHIPPING');

-- AlterTable
ALTER TABLE "Order"
ADD COLUMN     "loyaltyEarned"   BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "loyaltyPoints"   INTEGER,
ADD COLUMN     "loyaltyRefunded" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "LoyaltyAccount" (
    "id"             TEXT NOT NULL,
    "customerId"     TEXT NOT NULL,
    "balance"        INTEGER NOT NULL DEFAULT 0,
    "lifetimeEarned" INTEGER NOT NULL DEFAULT 0,
    "lifetimeSpent"  INTEGER NOT NULL DEFAULT 0,
    "expiresAt"      TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyTransaction" (
    "id"           TEXT NOT NULL,
    "accountId"    TEXT NOT NULL,
    "type"         "LoyaltyTxType" NOT NULL,
    "points"       INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason"       TEXT NOT NULL,
    "metadata"     JSONB,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderId"      TEXT,

    CONSTRAINT "LoyaltyTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyReward" (
    "id"          TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "description" TEXT,
    "image"       TEXT,
    "pointsCost"  INTEGER NOT NULL,
    "type"        "LoyaltyRewardType" NOT NULL,
    "enabled"     BOOLEAN NOT NULL DEFAULT false,
    "stock"       INTEGER,
    "validFrom"   TIMESTAMP(3),
    "validUntil"  TIMESTAMP(3),
    "metadata"    JSONB,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyReward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyAccount_customerId_key" ON "LoyaltyAccount"("customerId");

-- CreateIndex
CREATE INDEX "LoyaltyAccount_customerId_idx" ON "LoyaltyAccount"("customerId");

-- CreateIndex
CREATE INDEX "LoyaltyTransaction_accountId_createdAt_idx" ON "LoyaltyTransaction"("accountId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "LoyaltyTransaction_orderId_idx" ON "LoyaltyTransaction"("orderId");

-- CreateIndex
CREATE INDEX "LoyaltyTransaction_type_idx" ON "LoyaltyTransaction"("type");

-- CreateIndex
CREATE INDEX "LoyaltyReward_enabled_idx" ON "LoyaltyReward"("enabled");

-- CreateIndex
CREATE INDEX "LoyaltyReward_pointsCost_idx" ON "LoyaltyReward"("pointsCost");

-- Backfill: cria LoyaltyAccount(balance=0) para todos os Customer existentes
INSERT INTO "LoyaltyAccount" ("id", "customerId", "balance", "lifetimeEarned", "lifetimeSpent", "createdAt", "updatedAt")
SELECT
    'loyalty_' || "id",
    "id",
    0,
    0,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Customer"
ON CONFLICT ("customerId") DO NOTHING;
