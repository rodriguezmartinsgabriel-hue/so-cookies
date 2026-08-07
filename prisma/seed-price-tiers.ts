import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Script idempotente que:
 *  1. Garante que cada cookie assado tenha os 3 tiers oficiais:
 *       - 1–2 unidades → R$ 15,00
 *       - 3–9 unidades → R$ 13,00
 *       - 10+  unidades → R$ 10,00
 *  2. Remove tiers "Congelado Xun" órfãos que tenham ficado atrelados a
 *     produtos que não existem mais ou que não são congelados (cleanup).
 *  3. Garante que PricingSettings.activatePriceTier = true (sem mexer nas
 *     outras flags).
 *
 * Re-executável com segurança. Detecta o universo de produtos assados via
 * Product.sku começando com "CK-" (exceto "-FZ") OU Product.category em
 * {"Cookie", "Assados"} — flexível para acomodar os dois padrões já usados
 * no banco em diferentes momentos.
 *
 * Uso:
 *   $env:NODE_TLS_REJECT_UNAUTHORIZED="0"; npx tsx prisma/seed-price-tiers.ts
 */

const ASSADO_TIERS = [
  { name: "Assado 1un", minQty: 1, maxQty: 2, price: 15 },
  { name: "Assado 3un", minQty: 3, maxQty: 9, price: 13 },
  { name: "Assado 10un", minQty: 10, maxQty: null, price: 10 },
];

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

function slug(s: string) {
  return s.replace(/\s/g, "").toLowerCase();
}

async function main() {
  console.log("🌱 Sincronizando tiers de cookies assados\n");

  // 1. Descobrir produtos que devem receber tiers de assado.
  //    Critério: SKU começa com "CK-" e não termina com "-FZ" (congelados).
  //    Fallback: categoria "Cookie" ou "Assados".
  const allActive = await prisma.product.findMany({
    where: { deletedAt: null, active: true },
    select: { id: true, sku: true, name: true, category: true, price: true },
    orderBy: { name: "asc" },
  });

  const assadoProducts = allActive.filter((p) => {
    const sku = p.sku ?? "";
    if (sku.startsWith("CK-") && !sku.endsWith("-FZ")) return true;
    if (p.category === "Cookie" || p.category === "Assados") return true;
    return false;
  });

  console.log(`🍪 Produtos assados detectados: ${assadoProducts.length}`);
  for (const p of assadoProducts) {
    console.log(`   - ${p.sku} | ${p.name} | categoria="${p.category}" | R$ ${p.price.toString()}`);
  }

  // 2. Upsert dos 3 tiers oficiais por produto assado.
  let upserted = 0;
  for (const p of assadoProducts) {
    for (const t of ASSADO_TIERS) {
      const tierId = `${p.id}-${slug(t.name)}`;
      await prisma.priceTier.upsert({
        where: { id: tierId },
        update: {
          minQty: t.minQty,
          maxQty: t.maxQty,
          price: t.price,
          enabled: true,
          productId: p.id,
          name: t.name,
        },
        create: {
          id: tierId,
          productId: p.id,
          name: t.name,
          minQty: t.minQty,
          maxQty: t.maxQty,
          price: t.price,
          enabled: true,
        },
      });
      upserted++;
    }
  }
  console.log(`\n✅ Tiers oficiais upserted: ${upserted}`);

  // 3. Limpar tiers "Congelado Xun" que estejam atrelados a produtos assados.
  //    Esses tiers são resíduo do seed original que vinculava tiers de congelado
  //    aos IDs `ck-*` (que hoje pertencem aos assados).
  let removed = 0;
  const assadoIds = new Set(assadoProducts.map((p) => p.id));
  const orphanCongeladoTiers = await prisma.priceTier.findMany({
    where: {
      enabled: true,
      name: { startsWith: "Congelado " },
      productId: { in: Array.from(assadoIds) },
    },
    select: { id: true, name: true, productId: true },
  });
  for (const t of orphanCongeladoTiers) {
    await prisma.priceTier.update({
      where: { id: t.id },
      data: { enabled: false },
    });
    removed++;
    console.log(`   🗑️  Desativado: ${t.id} (${t.name}) atrelado a ${t.productId}`);
  }
  console.log(`\n🧹 Tiers órfãos "Congelado Xun" desativados: ${removed}`);

  // 4. Ativar PricingSettings.activatePriceTier (sem mexer nas outras flags).
  const current = await prisma.pricingSettings.findUnique({ where: { id: "default" } });
  const currentValue =
    current?.value && typeof current.value === "object" && !Array.isArray(current.value)
      ? (current.value as Record<string, unknown>)
      : {};

  const newValue = {
    ...currentValue,
    activatePriceTier: true,
  };

  await prisma.pricingSettings.upsert({
    where: { id: "default" },
    update: { value: newValue },
    create: {
      id: "default",
      key: "default",
      value: newValue,
      description: "Configuração padrão de precificação (opt-in)",
    },
  });
  console.log(`\n⚙️  PricingSettings.default.activatePriceTier = true`);

  // 5. Resumo final.
  const finalTiers = await prisma.priceTier.findMany({
    where: { enabled: true },
    select: {
      id: true,
      name: true,
      minQty: true,
      maxQty: true,
      price: true,
      product: { select: { sku: true, name: true } },
    },
    orderBy: [{ product: { sku: "asc" } }, { minQty: "asc" }],
  });
  console.log(`\n📋 Tiers ativos no banco após sync (${finalTiers.length}):`);
  for (const t of finalTiers) {
    console.log(
      `   - [${t.product.sku}] ${t.name} | qty ${t.minQty}–${t.maxQty ?? "∞"} | R$ ${t.price.toString()}`,
    );
  }

  const settings = await prisma.pricingSettings.findUnique({ where: { id: "default" } });
  console.log(`\n⚙️  PricingSettings.default final:`);
  console.log(`   ${JSON.stringify(settings?.value, null, 2).split("\n").join("\n   ")}`);

  console.log("\n🎉 Sync de tiers concluído!");
}

main()
  .catch((e) => {
    console.error("❌ Erro no sync:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
