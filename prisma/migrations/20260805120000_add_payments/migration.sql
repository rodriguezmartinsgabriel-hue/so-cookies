-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('AGUARDANDO_PAGAMENTO', 'PAGO', 'EXPIRADO', 'CANCELADO');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentExpiresAt" TIMESTAMP(3),
ADD COLUMN     "paymentExternalRef" TEXT,
ADD COLUMN     "paymentProvider" TEXT,
ADD COLUMN     "paymentProviderId" TEXT,
ADD COLUMN     "paymentQrCode" TEXT,
ADD COLUMN     "paymentQrCodeBase64" TEXT,
ADD COLUMN     "paymentStatus" "PaymentStatus";

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "paymentId" TEXT,
    "type" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentEvent_orderId_idx" ON "PaymentEvent"("orderId");

-- CreateIndex
CREATE INDEX "PaymentEvent_paymentId_idx" ON "PaymentEvent"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentEvent_receivedAt_idx" ON "PaymentEvent"("receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_paymentProviderId_key" ON "Order"("paymentProviderId");
