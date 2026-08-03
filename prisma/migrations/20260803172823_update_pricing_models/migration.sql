/*
  Warnings:

  - You are about to drop the column `endsAt` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `startsAt` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `active` on the `ShippingRate` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Campaign_startsAt_endsAt_idx";

-- DropIndex
DROP INDEX "ShippingRate_active_idx";

-- AlterTable
ALTER TABLE "Campaign" DROP COLUMN "endsAt",
DROP COLUMN "startsAt",
ADD COLUMN     "applicableProducts" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "usedCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN     "applicableProducts" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "applicableTypes" TEXT[] DEFAULT ARRAY['all']::TEXT[];

-- AlterTable
ALTER TABLE "PriceTier" ADD COLUMN     "enabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "PricingSettings" ALTER COLUMN "id" SET DEFAULT 'default';

-- AlterTable
ALTER TABLE "ShippingRate" DROP COLUMN "active",
ADD COLUMN     "enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "maxWeight" DOUBLE PRECISION,
ADD COLUMN     "minWeight" DOUBLE PRECISION,
ADD COLUMN     "region" TEXT;

-- CreateIndex
CREATE INDEX "Campaign_startDate_endDate_idx" ON "Campaign"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "ShippingRate_enabled_idx" ON "ShippingRate"("enabled");
