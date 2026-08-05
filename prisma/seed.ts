import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Iniciando seed...\n");

  // ─── Users ─────────────────────────────────────────────────
  const adminHash = await bcrypt.hash("admin123", 10);
  const operacionalHash = await bcrypt.hash("operacional123", 10);

  await prisma.user.upsert({
    where: { email: "admin@socookies.com" },
    update: {},
    create: { name: "Admin", email: "admin@socookies.com", password: adminHash, role: "ADMIN" },
  });
  await prisma.user.upsert({
    where: { email: "operacional@socookies.com" },
    update: {},
    create: { name: "Ana", email: "operacional@socookies.com", password: operacionalHash, role: "OPERACIONAL" },
  });
  await prisma.user.upsert({
    where: { email: "visualizador@socookies.com" },
    update: {},
    create: { name: "Visualizador", email: "visualizador@socookies.com", password: operacionalHash, role: "VISUALIZADOR" },
  });
  console.log("  ✅ Users (3)");

  // ─── Sale Channels ──────────────────────────────────────────
  const wpp = await prisma.saleChannel.upsert({ where: { id: "whatsapp" }, update: {}, create: { id: "whatsapp", name: "WhatsApp", commission: 0 } });
  await prisma.saleChannel.upsert({ where: { id: "ifood" }, update: {}, create: { id: "ifood", name: "iFood", commission: 0.23 } });
  await prisma.saleChannel.upsert({ where: { id: "rappi" }, update: {}, create: { id: "rappi", name: "Rappi", commission: 0.20 } });
  await prisma.saleChannel.upsert({ where: { id: "direto" }, update: {}, create: { id: "direto", name: "Direto", commission: 0 } });
  await prisma.saleChannel.upsert({ where: { id: "soapp" }, update: {}, create: { id: "soapp", name: "Só App", commission: 0 } });
  console.log("  ✅ Sale Channels (5)");

  // ─── Products (from Ficha Técnica) ───────────────────────────
  // Assados
  const prodClassico = await prisma.product.upsert({
    where: { sku: "CK-CLASSICO" },
    update: {},
    create: { id: "ck-classico", name: "Cookie Clássico", sku: "CK-CLASSICO", category: "Assados", price: 15, cost: 2.57, margin: 0.6998, unit: "un" },
  });
  const prodNino = await prisma.product.upsert({
    where: { sku: "CK-NINO" },
    update: {},
    create: { id: "ck-nino", name: "Cookie Niño", sku: "CK-NINO", category: "Assados", price: 15, cost: 3.33, margin: 0.6121, unit: "un" },
  });
  const prod3Choc = await prisma.product.upsert({
    where: { sku: "CK-3CHOC" },
    update: {},
    create: { id: "ck-3choc", name: "Cookie 3 Chocolates", sku: "CK-3CHOC", category: "Assados", price: 15, cost: 3.03, margin: 0.6468, unit: "un" },
  });
  console.log("  ✅ Products Assados (3)");

  // Congelados (variantes separadas)
  const prodClassicoFz = await prisma.product.upsert({
    where: { sku: "CK-CLASSICO-FZ" },
    update: {},
    create: { id: "ck-classico-fz", name: "Cookie Clássico - Congelado", sku: "CK-CLASSICO-FZ", category: "Congelados", price: 10, cost: 2.57, margin: 0.743, unit: "un" },
  });
  const prodNinoFz = await prisma.product.upsert({
    where: { sku: "CK-NINO-FZ" },
    update: {},
    create: { id: "ck-nino-fz", name: "Cookie Niño - Congelado", sku: "CK-NINO-FZ", category: "Congelados", price: 10, cost: 3.33, margin: 0.667, unit: "un" },
  });
  const prod3ChocFz = await prisma.product.upsert({
    where: { sku: "CK-3CHOC-FZ" },
    update: {},
    create: { id: "ck-3choc-fz", name: "Cookie 3 Chocolates - Congelado", sku: "CK-3CHOC-FZ", category: "Congelados", price: 10, cost: 3.03, margin: 0.697, unit: "un" },
  });
  console.log("  ✅ Products Congelados (3)");

  // ─── Delivery Zones & Routes ─────────────────────────────────
  const zoneCentro = await prisma.deliveryZone.upsert({
    where: { id: "zone-centro" },
    update: {},
    create: { id: "zone-centro", name: "São Paulo", active: true },
  });
  console.log("  ✅ Delivery Zone (1)");

  const routeDefs = [
    { id: "route-terca", name: "Rota Terça", dayOfWeek: 2 },
    { id: "route-sexta", name: "Rota Sexta", dayOfWeek: 5 },
  ];
  for (const def of routeDefs) {
    await prisma.deliveryRoute.upsert({
      where: { id: def.id },
      update: {},
      create: {
        id: def.id,
        name: def.name,
        zoneId: zoneCentro.id,
        recurring: true,
        dayOfWeek: def.dayOfWeek,
        date: null,
        startDate: null,
        endDate: null,
        cutoffTime: "18:00",
        cutoffOffsetDays: 1,
        windowStart: "12:00",
        windowEnd: "18:00",
        capacityEnabled: false,
        maxOrders: null,
        maxItems: null,
        active: true,
      },
    });
  }
  console.log("  ✅ Delivery Routes (2)");

  // ─── Price Tiers ─────────────────────────────────────────────
  // Assados
  const assadoTierDefs = [
    { name: "Assado 1un", minQty: 1, maxQty: 2, price: 15 },
    { name: "Assado 3un", minQty: 3, maxQty: 9, price: 13 },
    { name: "Assado 10un", minQty: 10, maxQty: null, price: 10 },
  ];
  const congeladoTierDefs = [
    { name: "Congelado 4un", minQty: 4, maxQty: 4, price: 10 },
    { name: "Congelado 6un", minQty: 6, maxQty: 6, price: 9 },
    { name: "Congelado 8un", minQty: 8, maxQty: 8, price: 8.75 },
  ];
  const assadoProductIds = [prodClassico.id, prodNino.id, prod3Choc.id];
  const congeladoProductIds = [prodClassicoFz.id, prodNinoFz.id, prod3ChocFz.id];
  let tierCount = 0;
  for (const pid of assadoProductIds) {
    for (const t of assadoTierDefs) {
      await prisma.priceTier.upsert({
        where: { id: `${pid}-${t.name.replace(/\s/g, "").toLowerCase()}` },
        update: {},
        create: {
          id: `${pid}-${t.name.replace(/\s/g, "").toLowerCase()}`,
          productId: pid,
          name: t.name,
          minQty: t.minQty,
          maxQty: t.maxQty,
          price: t.price,
        },
      });
      tierCount++;
    }
  }
  for (const pid of congeladoProductIds) {
    for (const t of congeladoTierDefs) {
      await prisma.priceTier.upsert({
        where: { id: `${pid}-${t.name.replace(/\s/g, "").toLowerCase()}` },
        update: {},
        create: {
          id: `${pid}-${t.name.replace(/\s/g, "").toLowerCase()}`,
          productId: pid,
          name: t.name,
          minQty: t.minQty,
          maxQty: t.maxQty,
          price: t.price,
        },
      });
      tierCount++;
    }
  }
  console.log(`  ✅ Price Tiers (${tierCount})`);

  // ─── Pricing Settings (opt-in explícito) ─────────────────────
  // Sem esta linha, o Pricing Engine não ativa nenhuma promoção por padrão.
  // Faixas de quantidade (tiers) ficam ativas porque o seed as provisiona.
  await prisma.pricingSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      key: "default",
      value: {
        activatePriceTier: true,
        activateCoupon: false,
        activateCampaign: false,
        activateB2B: false,
        activateFreeShipping: false,
        b2bDiscountPercent: 0,
      },
      description: "Configuração padrão de precificação (opt-in)",
    },
  });
  console.log("  ✅ Pricing Settings (1)");

  // ─── Ingredients (from Ficha Técnica) ────────────────────────
  const ingData = [
    // id, name, costPerKg, supplier
    ["ing-manteiga", "Manteiga", 43.90, "Atacado Central"],
    ["ing-acucar-masc", "Açúcar Mascavo", 10.79, "Distribuidora Local"],
    ["ing-acucar-ref", "Açúcar Refinado", 4.00, "Distribuidora Local"],
    ["ing-baunilha", "Extrato de Baunilha", 400.00, "Distribuidora Local"],
    ["ing-farinha", "Farinha de Trigo", 5.00, "Distribuidora Local"],
    ["ing-fermento", "Fermento Químico", 59.56, "Distribuidora Local"],
    ["ing-sal", "Sal", 3.00, "Distribuidora Local"],
    ["ing-ovos", "Ovos", 9.50, "Granja Modelo"],
    ["ing-choc-meio", "Chocolate Meio Amargo", 108.66, "Fornecedor Chocolates"],
    ["ing-cafe", "Café", 110.00, "Distribuidora Local"],
    ["ing-choc-branco", "Chocolate Branco", 77.67, "Fornecedor Chocolates"],
    ["ing-leite-ninho", "Leite em Pó", 110.00, "Distribuidora Local"],
    ["ing-cacau", "Cacau 100%", 110.00, "Fornecedor Chocolates"],
  ];
  for (const row of ingData) {
    const [id, name, cost, supplier] = row as [string, string, number, string];
    await prisma.ingredient.upsert({
      where: { id },
      update: {},
      create: { id, name, stockKg: 0, minStockKg: 0, costPerKg: cost, supplier },
    });
  }
  console.log("  ✅ Ingredients (13)");

  // ─── Recipes (from Ficha Técnica) ──────────────────────────
  // Cookie Clássico — lote 10 cookies, rende ~11.35, custo R$29.21
  await prisma.recipe.upsert({
    where: { id: "rec-classico" },
    update: {},
    create: {
      id: "rec-classico", name: "Cookie Clássico", yield: 11, yieldUnit: "un",
      productId: prodClassico.id, totalCost: 29.21,
      ingredients: {
        create: [
          { ingredientId: "ing-manteiga", qty: 0.100, unit: "kg" },
          { ingredientId: "ing-acucar-masc", qty: 0.120, unit: "kg" },
          { ingredientId: "ing-acucar-ref", qty: 0.060, unit: "kg" },
          { ingredientId: "ing-baunilha", qty: 0.00002, unit: "kg" },
          { ingredientId: "ing-farinha", qty: 0.210, unit: "kg" },
          { ingredientId: "ing-fermento", qty: 0.010, unit: "kg" },
          { ingredientId: "ing-sal", qty: 0.005, unit: "kg" },
          { ingredientId: "ing-ovos", qty: 0.100, unit: "kg" },
          { ingredientId: "ing-choc-meio", qty: 0.175, unit: "kg" },
          { ingredientId: "ing-cafe", qty: 0.015, unit: "kg" },
        ],
      },
    },
  });
  // Cookie Clássico Congelado — mesma receita do assado
  await prisma.recipe.upsert({
    where: { id: "rec-classico-fz" },
    update: {},
    create: {
      id: "rec-classico-fz", name: "Cookie Clássico - Congelado", yield: 11, yieldUnit: "un",
      productId: prodClassicoFz.id, totalCost: 29.21,
      ingredients: {
        create: [
          { ingredientId: "ing-manteiga", qty: 0.100, unit: "kg" },
          { ingredientId: "ing-acucar-masc", qty: 0.120, unit: "kg" },
          { ingredientId: "ing-acucar-ref", qty: 0.060, unit: "kg" },
          { ingredientId: "ing-baunilha", qty: 0.00002, unit: "kg" },
          { ingredientId: "ing-farinha", qty: 0.210, unit: "kg" },
          { ingredientId: "ing-fermento", qty: 0.010, unit: "kg" },
          { ingredientId: "ing-sal", qty: 0.005, unit: "kg" },
          { ingredientId: "ing-ovos", qty: 0.100, unit: "kg" },
          { ingredientId: "ing-choc-meio", qty: 0.175, unit: "kg" },
          { ingredientId: "ing-cafe", qty: 0.015, unit: "kg" },
        ],
      },
    },
  });
  // Cookie Niño — lote 10 cookies, rende ~8.6, custo R$28.60
  await prisma.recipe.upsert({
    where: { id: "rec-nino" },
    update: {},
    create: {
      id: "rec-nino", name: "Cookie Niño", yield: 9, yieldUnit: "un",
      productId: prodNino.id, totalCost: 28.60,
      ingredients: {
        create: [
          { ingredientId: "ing-manteiga", qty: 0.100, unit: "kg" },
          { ingredientId: "ing-acucar-masc", qty: 0.110, unit: "kg" },
          { ingredientId: "ing-acucar-ref", qty: 0.050, unit: "kg" },
          { ingredientId: "ing-farinha", qty: 0.100, unit: "kg" },
          { ingredientId: "ing-fermento", qty: 0.010, unit: "kg" },
          { ingredientId: "ing-sal", qty: 0.005, unit: "kg" },
          { ingredientId: "ing-ovos", qty: 0.105, unit: "kg" },
          { ingredientId: "ing-choc-branco", qty: 0.125, unit: "kg" },
          { ingredientId: "ing-leite-ninho", qty: 0.100, unit: "kg" },
        ],
      },
    },
  });
  // Cookie Niño Congelado — mesma receita do assado
  await prisma.recipe.upsert({
    where: { id: "rec-nino-fz" },
    update: {},
    create: {
      id: "rec-nino-fz", name: "Cookie Niño - Congelado", yield: 9, yieldUnit: "un",
      productId: prodNinoFz.id, totalCost: 28.60,
      ingredients: {
        create: [
          { ingredientId: "ing-manteiga", qty: 0.100, unit: "kg" },
          { ingredientId: "ing-acucar-masc", qty: 0.110, unit: "kg" },
          { ingredientId: "ing-acucar-ref", qty: 0.050, unit: "kg" },
          { ingredientId: "ing-farinha", qty: 0.100, unit: "kg" },
          { ingredientId: "ing-fermento", qty: 0.010, unit: "kg" },
          { ingredientId: "ing-sal", qty: 0.005, unit: "kg" },
          { ingredientId: "ing-ovos", qty: 0.105, unit: "kg" },
          { ingredientId: "ing-choc-branco", qty: 0.125, unit: "kg" },
          { ingredientId: "ing-leite-ninho", qty: 0.100, unit: "kg" },
        ],
      },
    },
  });
  // Cookie 3 Chocolates — lote 10 cookies, rende ~10.81, custo R$32.73
  await prisma.recipe.upsert({
    where: { id: "rec-3choc" },
    update: {},
    create: {
      id: "rec-3choc", name: "Cookie 3 Chocolates", yield: 11, yieldUnit: "un",
      productId: prod3Choc.id, totalCost: 32.73,
      ingredients: {
        create: [
          { ingredientId: "ing-manteiga", qty: 0.100, unit: "kg" },
          { ingredientId: "ing-acucar-masc", qty: 0.120, unit: "kg" },
          { ingredientId: "ing-acucar-ref", qty: 0.060, unit: "kg" },
          { ingredientId: "ing-baunilha", qty: 0.00002, unit: "kg" },
          { ingredientId: "ing-farinha", qty: 0.210, unit: "kg" },
          { ingredientId: "ing-fermento", qty: 0.010, unit: "kg" },
          { ingredientId: "ing-sal", qty: 0.005, unit: "kg" },
          { ingredientId: "ing-ovos", qty: 0.105, unit: "kg" },
          { ingredientId: "ing-choc-branco", qty: 0.100, unit: "kg" },
          { ingredientId: "ing-choc-meio", qty: 0.100, unit: "kg" },
          { ingredientId: "ing-cafe", qty: 0.030, unit: "kg" },
          { ingredientId: "ing-cacau", qty: 0.020, unit: "kg" },
        ],
      },
    },
  });
  // Cookie 3 Chocolates Congelado — mesma receita do assado
  await prisma.recipe.upsert({
    where: { id: "rec-3choc-fz" },
    update: {},
    create: {
      id: "rec-3choc-fz", name: "Cookie 3 Chocolates - Congelado", yield: 11, yieldUnit: "un",
      productId: prod3ChocFz.id, totalCost: 32.73,
      ingredients: {
        create: [
          { ingredientId: "ing-manteiga", qty: 0.100, unit: "kg" },
          { ingredientId: "ing-acucar-masc", qty: 0.120, unit: "kg" },
          { ingredientId: "ing-acucar-ref", qty: 0.060, unit: "kg" },
          { ingredientId: "ing-baunilha", qty: 0.00002, unit: "kg" },
          { ingredientId: "ing-farinha", qty: 0.210, unit: "kg" },
          { ingredientId: "ing-fermento", qty: 0.010, unit: "kg" },
          { ingredientId: "ing-sal", qty: 0.005, unit: "kg" },
          { ingredientId: "ing-ovos", qty: 0.105, unit: "kg" },
          { ingredientId: "ing-choc-branco", qty: 0.100, unit: "kg" },
          { ingredientId: "ing-choc-meio", qty: 0.100, unit: "kg" },
          { ingredientId: "ing-cafe", qty: 0.030, unit: "kg" },
          { ingredientId: "ing-cacau", qty: 0.020, unit: "kg" },
        ],
      },
    },
  });
  console.log("  ✅ Recipes (6)");

  // ─── Sales (from Vendas sheet) ─────────────────────────────
  // All sales on 2026-07-24, channel WhatsApp, total R$419
  const saleDate = new Date("2026-07-24T10:00:00-03:00");
  await prisma.sale.upsert({
    where: { id: "venda-julho" },
    update: {},
    create: {
      id: "venda-julho",
      total: 419,
      createdAt: saleDate,
      channelId: wpp.id,
      items: {
        create: [
          { productId: prodClassico.id, qty: 6, price: 13 },
          { productId: prodClassicoFz.id, qty: 1, price: 10 },
          { productId: prodNino.id, qty: 7, price: 13 },
          { productId: prodNinoFz.id, qty: 1, price: 10 },
          { productId: prod3Choc.id, qty: 14, price: 15 },
          { productId: prod3ChocFz.id, qty: 2, price: 10 },
        ],
      },
    },
  });
  console.log("  ✅ Sales (1 venda com 6 itens, total R$419)");

  // ─── Orders (2 from Vendas channels) ─────────────────────────
  await prisma.order.upsert({
    where: { id: "ord-wpp-julho" },
    update: {},
    create: {
      id: "ord-wpp-julho",
      channel: "WhatsApp",
      customer: "Cliente WhatsApp",
      total: 419,
      status: "CONCLUIDO",
      createdAt: saleDate,
      items: {
        create: [
          { productId: prodClassico.id, qty: 6, price: 13 },
          { productId: prodClassicoFz.id, qty: 1, price: 10 },
          { productId: prodNino.id, qty: 7, price: 13 },
          { productId: prodNinoFz.id, qty: 1, price: 10 },
          { productId: prod3Choc.id, qty: 14, price: 15 },
          { productId: prod3ChocFz.id, qty: 2, price: 10 },
        ],
      },
    },
  });
  await prisma.order.upsert({
    where: { id: "ord-ifood-julho" },
    update: {},
    create: {
      id: "ord-ifood-julho",
      channel: "iFood",
      customer: "Cliente iFood",
      total: 78,
      status: "CONCLUIDO",
      createdAt: new Date("2026-07-20T12:00:00-03:00"),
      items: {
        create: [
          { productId: prodClassico.id, qty: 6, price: 13 },
        ],
      },
    },
  });
  console.log("  ✅ Orders (2)");

  // ─── Cash Flow (from Fluxo de Caixa sheet) ──────────────────
  await prisma.cashFlow.upsert({
    where: { id: "cf-saida-insumos" },
    update: {},
    create: {
      id: "cf-saida-insumos",
      type: "SAIDA",
      category: "Insumos",
      description: "Compra de farinha, manteiga e chocolate",
      amount: 320,
      date: new Date("2026-07-01"),
    },
  });
  await prisma.cashFlow.upsert({
    where: { id: "cf-entrada-vendas" },
    update: {},
    create: {
      id: "cf-entrada-vendas",
      type: "ENTRADA",
      category: "Vendas",
      description: "Vendas da semana (iFood + direto)",
      amount: 450,
      date: new Date("2026-07-20"),
    },
  });
  console.log("  ✅ Cash Flow (2 lançamentos)");

  // ─── Production (from Produção e Perdas sheet) ─────────────
  await prisma.production.upsert({
    where: { batchCode: "LOTE-20260719-NINO" },
    update: {},
    create: {
      batchCode: "LOTE-20260719-NINO",
      productId: prodNino.id,
      qty: 20,
      startTime: new Date("2026-07-19T06:00:00-03:00"),
      endTime: new Date("2026-07-19T08:00:00-03:00"),
      status: "concluido",
      notes: "Forno com temperatura irregular — 1 unidade perdida",
    },
  });
  console.log("  ✅ Production (1 lote)\n");

  console.log("🎉 Seed completo!");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
