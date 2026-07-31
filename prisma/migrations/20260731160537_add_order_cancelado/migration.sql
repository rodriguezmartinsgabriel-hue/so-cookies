-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'CANCELADO';

-- CreateIndex
CREATE INDEX "CashFlow_type_idx" ON "CashFlow"("type");

-- CreateIndex
CREATE INDEX "CashFlow_category_idx" ON "CashFlow"("category");

-- CreateIndex
CREATE INDEX "CashFlow_date_idx" ON "CashFlow"("date");

-- CreateIndex
CREATE INDEX "Document_category_idx" ON "Document"("category");

-- CreateIndex
CREATE INDEX "Document_userId_idx" ON "Document"("userId");

-- CreateIndex
CREATE INDEX "Ingredient_name_idx" ON "Ingredient"("name");

-- CreateIndex
CREATE INDEX "Ingredient_supplier_idx" ON "Ingredient"("supplier");

-- CreateIndex
CREATE INDEX "Ingredient_stockKg_idx" ON "Ingredient"("stockKg");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "Order_updatedAt_idx" ON "Order"("updatedAt");

-- CreateIndex
CREATE INDEX "Order_channel_idx" ON "Order"("channel");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- CreateIndex
CREATE INDEX "Product_active_idx" ON "Product"("active");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");

-- CreateIndex
CREATE INDEX "Production_status_idx" ON "Production"("status");

-- CreateIndex
CREATE INDEX "Production_startTime_idx" ON "Production"("startTime");

-- CreateIndex
CREATE INDEX "Production_productId_idx" ON "Production"("productId");

-- CreateIndex
CREATE INDEX "Recipe_name_idx" ON "Recipe"("name");

-- CreateIndex
CREATE INDEX "Sale_channelId_idx" ON "Sale"("channelId");

-- CreateIndex
CREATE INDEX "Sale_createdAt_idx" ON "Sale"("createdAt");

-- CreateIndex
CREATE INDEX "Sale_userId_idx" ON "Sale"("userId");

-- CreateIndex
CREATE INDEX "SaleChannel_name_idx" ON "SaleChannel"("name");

-- CreateIndex
CREATE INDEX "SaleItem_saleId_idx" ON "SaleItem"("saleId");

-- CreateIndex
CREATE INDEX "SaleItem_productId_idx" ON "SaleItem"("productId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");
