-- AlterTable
ALTER TABLE "Order" ADD COLUMN "platform" TEXT,
ADD COLUMN "externalId" TEXT,
ADD COLUMN "externalStatus" TEXT,
ADD COLUMN "deliveryAddress" TEXT,
ADD COLUMN "customerPhone" TEXT,
ADD COLUMN "platformFee" DOUBLE PRECISION,
ADD COLUMN "confirmBy" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Order_platform_idx" ON "Order"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "Order_platform_externalId_key" ON "Order"("platform", "externalId");

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "name" TEXT,
ADD COLUMN "notes" TEXT;
ALTER TABLE "OrderItem" ALTER COLUMN "productId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "IntegrationAccount" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "storeName" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "credentials" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalItemMapping" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "externalItemId" TEXT NOT NULL,
    "externalName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productId" TEXT NOT NULL,

    CONSTRAINT "ExternalItemMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboundEvent" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "orderId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "InboundEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationAccount_platform_storeName_key" ON "IntegrationAccount"("platform", "storeName");

-- CreateIndex
CREATE INDEX "IntegrationAccount_platform_idx" ON "IntegrationAccount"("platform");

-- CreateIndex
CREATE INDEX "IntegrationAccount_enabled_idx" ON "IntegrationAccount"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalItemMapping_platform_externalItemId_key" ON "ExternalItemMapping"("platform", "externalItemId");

-- CreateIndex
CREATE INDEX "ExternalItemMapping_productId_idx" ON "ExternalItemMapping"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "InboundEvent_platform_eventId_key" ON "InboundEvent"("platform", "eventId");

-- CreateIndex
CREATE INDEX "InboundEvent_platform_status_idx" ON "InboundEvent"("platform", "status");

-- CreateIndex
CREATE INDEX "InboundEvent_createdAt_idx" ON "InboundEvent"("createdAt");
