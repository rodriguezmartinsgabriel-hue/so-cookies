-- AlterTable
ALTER TABLE "DeliveryRoute" ADD COLUMN     "windowEnd" TEXT NOT NULL DEFAULT '18:00';

-- AlterTable
ALTER TABLE "DeliveryRoute" ADD COLUMN     "windowStart" TEXT NOT NULL DEFAULT '12:00';
