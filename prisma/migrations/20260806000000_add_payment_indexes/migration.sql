-- DropIndex
-- Tabelas novas não possuem índices legacy para remover. Esta migration apenas adiciona
-- índices em colunas monetárias/status frequentemente filtradas.

-- CreateIndex
CREATE INDEX "Order_paymentStatus_idx" ON "Order"("paymentStatus");

-- CreateIndex
CREATE INDEX "PaymentEvent_status_idx" ON "PaymentEvent"("status");
