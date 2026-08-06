-- Migration: Float → Decimal(12,2) para campos monetários
-- Decisão 1B: apenas monetário. Estoque/nutrição (stockKg, cost, margin, etc.) permanecem Float.

-- Product
ALTER TABLE "Product" ALTER COLUMN "price" TYPE DECIMAL(12, 2) USING ("price"::numeric);

-- PriceTier
ALTER TABLE "PriceTier" ALTER COLUMN "price" TYPE DECIMAL(12, 2) USING ("price"::numeric);

-- SaleChannel
ALTER TABLE "SaleChannel" ALTER COLUMN "commission" TYPE DECIMAL(12, 2) USING ("commission"::numeric);

-- Sale
ALTER TABLE "Sale" ALTER COLUMN "total" TYPE DECIMAL(12, 2) USING ("total"::numeric);

-- SaleItem
ALTER TABLE "SaleItem" ALTER COLUMN "price" TYPE DECIMAL(12, 2) USING ("price"::numeric);

-- Order
ALTER TABLE "Order" ALTER COLUMN "total" TYPE DECIMAL(12, 2) USING ("total"::numeric);
ALTER TABLE "Order" ALTER COLUMN "platformFee" TYPE DECIMAL(12, 2) USING ("platformFee"::numeric);

-- OrderItem
ALTER TABLE "OrderItem" ALTER COLUMN "price" TYPE DECIMAL(12, 2) USING ("price"::numeric);

-- CashFlow
ALTER TABLE "CashFlow" ALTER COLUMN "amount" TYPE DECIMAL(12, 2) USING ("amount"::numeric);

-- DeliveryCost
ALTER TABLE "DeliveryCost" ALTER COLUMN "amount" TYPE DECIMAL(12, 2) USING ("amount"::numeric);

-- Coupon
ALTER TABLE "Coupon" ALTER COLUMN "value" TYPE DECIMAL(12, 2) USING ("value"::numeric);
ALTER TABLE "Coupon" ALTER COLUMN "minOrderValue" TYPE DECIMAL(12, 2) USING ("minOrderValue"::numeric);
ALTER TABLE "Coupon" ALTER COLUMN "maxDiscount" TYPE DECIMAL(12, 2) USING ("maxDiscount"::numeric);

-- ShippingRate
ALTER TABLE "ShippingRate" ALTER COLUMN "basePrice" TYPE DECIMAL(12, 2) USING ("basePrice"::numeric);
ALTER TABLE "ShippingRate" ALTER COLUMN "pricePerKm" TYPE DECIMAL(12, 2) USING ("pricePerKm"::numeric);
ALTER TABLE "ShippingRate" ALTER COLUMN "minOrderValue" TYPE DECIMAL(12, 2) USING ("minOrderValue"::numeric);
ALTER TABLE "ShippingRate" ALTER COLUMN "freeShippingThreshold" TYPE DECIMAL(12, 2) USING ("freeShippingThreshold"::numeric);
