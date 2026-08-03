-- Backfill idempotente: vincula/cria Contact (tipo CLIENTE) para todos os Customer
-- 1) Vincula Contacts manuais existentes (mesmo email, tipo CLIENTE) ao Customer
UPDATE "Contact" c
SET "customerId" = cust.id, "updatedAt" = CURRENT_TIMESTAMP
FROM "Customer" cust
WHERE c."customerId" IS NULL
  AND c.email = cust.email
  AND c.type = 'CLIENTE';

-- 2) Cria Contact para os Customer sem vínculo
INSERT INTO "Contact" (id, name, email, phone, type, notes, "createdAt", "updatedAt", "customerId")
SELECT 'app_' || cust.id,
       cust.name,
       cust.email,
       cust.phone,
       'CLIENTE',
       'Cliente cadastrado pelo app',
       cust."createdAt",
       cust."createdAt",
       cust.id
FROM "Customer" cust
LEFT JOIN "Contact" c ON c."customerId" = cust.id
WHERE c.id IS NULL;
