-- Deduplicação prévia: manter apenas o tier mais recente por (productId, minQty).
-- Em empate de updatedAt, mantém o de menor id (determinístico).
DELETE FROM "PriceTier" a
USING "PriceTier" b
WHERE a."productId" = b."productId"
  AND a."minQty" = b."minQty"
  AND (
    a."updatedAt" < b."updatedAt"
    OR (a."updatedAt" = b."updatedAt" AND a."id" > b."id")
  );

-- CreateIndex
CREATE UNIQUE INDEX "PriceTier_productId_minQty_key" ON "PriceTier"("productId", "minQty");
