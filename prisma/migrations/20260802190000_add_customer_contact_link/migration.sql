-- Vínculo permanente Customer <-> Contact (cliente do app na aba Contatos do manager)
ALTER TABLE "Contact" ADD COLUMN "customerId" TEXT;

ALTER TABLE "Contact" ADD CONSTRAINT "Contact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Contact_customerId_key" ON "Contact"("customerId");
