-- AlterTable: campos de endereço no Contact (sincronizados do Customer/app)
ALTER TABLE "Contact"
ADD COLUMN "addressCep" TEXT,
ADD COLUMN "addressStreet" TEXT,
ADD COLUMN "addressNumber" TEXT,
ADD COLUMN "addressComplement" TEXT,
ADD COLUMN "addressNeighborhood" TEXT,
ADD COLUMN "addressCity" TEXT,
ADD COLUMN "addressState" TEXT;

-- Backfill idempotente: copia o endereço do Customer para o Contact vinculado.
-- Roda uma vez na migração (clientes existentes) e é seguro re-executar.
UPDATE "Contact" c
SET "addressCep" = cust."addressCep",
    "addressStreet" = cust."addressStreet",
    "addressNumber" = cust."addressNumber",
    "addressComplement" = cust."addressComplement",
    "addressNeighborhood" = cust."addressNeighborhood",
    "addressCity" = cust."addressCity",
    "addressState" = cust."addressState",
    "updatedAt" = CURRENT_TIMESTAMP
FROM "Customer" cust
WHERE c."customerId" = cust.id
  AND c."addressStreet" IS NULL;

-- CreateIndex
CREATE INDEX "Contact_addressCity_idx" ON "Contact"("addressCity");

-- CreateIndex
CREATE INDEX "Contact_addressCep_idx" ON "Contact"("addressCep");
