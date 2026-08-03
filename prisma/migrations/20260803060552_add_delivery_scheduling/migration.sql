-- DropForeignKey
ALTER TABLE "Contact" DROP CONSTRAINT "Contact_customerId_fkey";

-- DropForeignKey
ALTER TABLE "CustomerAccount" DROP CONSTRAINT "CustomerAccount_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_customerId_fkey";

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "addressCep" TEXT,
ADD COLUMN     "addressCity" TEXT,
ADD COLUMN     "addressComplement" TEXT,
ADD COLUMN     "addressNeighborhood" TEXT,
ADD COLUMN     "addressNumber" TEXT,
ADD COLUMN     "addressState" TEXT,
ADD COLUMN     "addressStreet" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryCep" TEXT,
ADD COLUMN     "deliveryCity" TEXT,
ADD COLUMN     "deliveryComplement" TEXT,
ADD COLUMN     "deliveryDate" DATE,
ADD COLUMN     "deliveryNeighborhood" TEXT,
ADD COLUMN     "deliveryNumber" TEXT,
ADD COLUMN     "deliveryRouteId" TEXT,
ADD COLUMN     "deliveryState" TEXT,
ADD COLUMN     "deliveryStreet" TEXT,
ADD COLUMN     "deliveryZoneId" TEXT;

-- AlterTable
ALTER TABLE "PriceTier" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Production" ADD COLUMN     "deliveryDate" DATE;

-- CreateTable
CREATE TABLE "DeliveryZone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryRoute" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "recurring" BOOLEAN NOT NULL DEFAULT true,
    "dayOfWeek" INTEGER,
    "date" DATE,
    "startDate" DATE,
    "endDate" DATE,
    "cutoffTime" TEXT NOT NULL DEFAULT '18:00',
    "cutoffOffsetDays" INTEGER NOT NULL DEFAULT 1,
    "capacityEnabled" BOOLEAN NOT NULL DEFAULT false,
    "maxOrders" INTEGER,
    "maxItems" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryBlockedDate" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryBlockedDate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryZone_name_key" ON "DeliveryZone"("name");

-- CreateIndex
CREATE INDEX "DeliveryZone_active_idx" ON "DeliveryZone"("active");

-- CreateIndex
CREATE INDEX "DeliveryZone_name_idx" ON "DeliveryZone"("name");

-- CreateIndex
CREATE INDEX "DeliveryRoute_zoneId_idx" ON "DeliveryRoute"("zoneId");

-- CreateIndex
CREATE INDEX "DeliveryRoute_active_idx" ON "DeliveryRoute"("active");

-- CreateIndex
CREATE INDEX "DeliveryRoute_recurring_idx" ON "DeliveryRoute"("recurring");

-- CreateIndex
CREATE INDEX "DeliveryRoute_dayOfWeek_idx" ON "DeliveryRoute"("dayOfWeek");

-- CreateIndex
CREATE INDEX "DeliveryRoute_date_idx" ON "DeliveryRoute"("date");

-- CreateIndex
CREATE INDEX "DeliveryBlockedDate_zoneId_idx" ON "DeliveryBlockedDate"("zoneId");

-- CreateIndex
CREATE INDEX "DeliveryBlockedDate_date_idx" ON "DeliveryBlockedDate"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryBlockedDate_zoneId_date_key" ON "DeliveryBlockedDate"("zoneId", "date");

-- CreateIndex
CREATE INDEX "Order_deliveryDate_idx" ON "Order"("deliveryDate");

-- CreateIndex
CREATE INDEX "Order_deliveryRouteId_idx" ON "Order"("deliveryRouteId");

-- CreateIndex
CREATE INDEX "Order_deliveryZoneId_idx" ON "Order"("deliveryZoneId");

-- CreateIndex
CREATE INDEX "Production_deliveryDate_idx" ON "Production"("deliveryDate");
