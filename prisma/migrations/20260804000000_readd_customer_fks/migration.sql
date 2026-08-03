-- Re-add foreign key constraints dropped by 20260803060552_add_delivery_scheduling

-- Contact → Customer
ALTER TABLE "Contact"
  ADD CONSTRAINT "Contact_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
  ON DELETE SET NULL;

-- CustomerAccount → Customer
ALTER TABLE "CustomerAccount"
  ADD CONSTRAINT "CustomerAccount_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
  ON DELETE CASCADE;

-- Order → Customer
ALTER TABLE "Order"
  ADD CONSTRAINT "Order_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
  ON DELETE SET NULL;