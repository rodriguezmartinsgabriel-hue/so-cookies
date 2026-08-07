-- Backfill idempotente: copia o telefone do Customer para o Contact vinculado
-- quando o cliente tem telefone e o contato ainda está sem. Não sobrescreve
-- telefones já preenchidos no contato. Roda uma vez e é seguro re-executar.
UPDATE "Contact" c
SET "phone" = cust."phone",
    "updatedAt" = CURRENT_TIMESTAMP
FROM "Customer" cust
WHERE c."customerId" = cust.id
  AND cust."phone" IS NOT NULL
  AND trim(cust."phone") <> ''
  AND (c."phone" IS NULL OR trim(c."phone") = '');
