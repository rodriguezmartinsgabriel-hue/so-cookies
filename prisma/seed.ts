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
  const ifood = await prisma.saleChannel.upsert({ where: { id: "ifood" }, update: {}, create: { id: "ifood", name: "iFood", commission: 0.23 } });
  const rappi = await prisma.saleChannel.upsert({ where: { id: "rappi" }, update: {}, create: { id: "rappi", name: "Rappi", commission: 0.20 } });
  const direto = await prisma.saleChannel.upsert({ where: { id: "direto" }, update: {}, create: { id: "direto", name: "Direto", commission: 0 } });
  console.log("  ✅ Sale Channels (4)");

  // ─── Products ───────────────────────────────────────────────
  // Cost values from Ficha Técnica: custo por unidade
  const prodClassico = await prisma.product.upsert({
    where: { sku: "CK-CLASSICO" },
    update: {},
    create: { id: "ck-classico", name: "Cookie Clássico", sku: "CK-CLASSICO", category: "Cookie", price: 15, cost: 1.547, margin: 0.8969, unit: "un" },
  });
  const prodNino = await prisma.product.upsert({
    where: { sku: "CK-NINO" },
    update: {},
    create: { id: "ck-nino", name: "Cookie Niño", sku: "CK-NINO", category: "Cookie", price: 15, cost: 1.078, margin: 0.9281, unit: "un" },
  });
  const prod3Choc = await prisma.product.upsert({
    where: { sku: "CK-3CHOC" },
    update: {},
    create: { id: "ck-3choc", name: "Cookie 3 Chocolates", sku: "CK-3CHOC", category: "Cookie", price: 15, cost: 1.168, margin: 0.9221, unit: "un" },
  });
  console.log("  ✅ Products (3)");

  // ─── Price Tiers ─────────────────────────────────────────────
  // From Tabela de Preços: same tiers for all products
  const tierDefs = [
    { name: "Assado 1un", minQty: 1, maxQty: 2, price: 15 },
    { name: "Assado 3un", minQty: 3, maxQty: 9, price: 13 },
    { name: "Assado 10un", minQty: 10, maxQty: null, price: 10 },
    { name: "Congelado 4un", minQty: 4, maxQty: 4, price: 10 },
    { name: "Congelado 6un", minQty: 6, maxQty: 6, price: 9 },
    { name: "Congelado 8un", minQty: 8, maxQty: 8, price: 8.75 },
  ];
  const productIds = [prodClassico.id, prodNino.id, prod3Choc.id];
  let tierCount = 0;
  for (const pid of productIds) {
    for (const t of tierDefs) {
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

  // ─── Ingredients (from Ficha Técnica + Estoque de Insumos) ──
  const ingData = [
    // id, name, stockKg, minStockKg, costPerKg, supplier
    // stock from Estoque de Insumos sheet (converted g→kg)
    ["ing-farinha", "Farinha de trigo", 5, 1, 8, "Distribuidora Local"],
    ["ing-manteiga", "Manteiga", 1.5, 1.5, 40, "Atacado Central"],
    ["ing-acucar-ref", "Açúcar refinado", 2, 0.5, 6, "Distribuidora Local"],
    ["ing-acucar-masc", "Açúcar mascavo", 2, 0.5, 10, "Distribuidora Local"],
    ["ing-ovos", "Ovos", 1, 0.5, 16, "Granja Modelo"],
    ["ing-choc-meio", "Chocolate meio amargo", 2.4, 1, 110, "Fornecedor Chocolates"],
    ["ing-sal", "Sal", 0.5, 0.2, 20, "Distribuidora Local"],
    ["ing-leite-ninho", "Leite Ninho em pó", 0.5, 0.3, 60, "Distribuidora Local"],
    ["ing-choc-branco", "Chocolate branco", 0.8, 0.3, 50, "Fornecedor Chocolates"],
    ["ing-choc-mix", "Mix chocolate branco/meio amargo/ao leite", 0.8, 0.3, 47, "Fornecedor Chocolates"],
    ["ing-choc-cobertura", "Chocolate meio amargo (cobertura)", 0.5, 0.2, 45, "Fornecedor Chocolates"],
  ];
  for (const row of ingData) {
    const [id, name, stock, minStock, cost, supplier] = row as [string, string, number, number, number, string];
    await prisma.ingredient.upsert({
      where: { id },
      update: {},
      create: { id, name, stockKg: stock, minStockKg: minStock, costPerKg: cost, supplier },
    });
  }
  console.log("  ✅ Ingredients (11)");

  // ─── Recipes (from Ficha Técnica) ──────────────────────────
  // Cookie Clássico — yield 20un, total cost R$30.94, cost/un R$1.547
  const recClassico = await prisma.recipe.upsert({
    where: { id: "rec-classico" },
    update: {},
    create: {
      id: "rec-classico", name: "Cookie Clássico", yield: 20, yieldUnit: "un",
      productId: prodClassico.id, totalCost: 30.94,
      ingredients: {
        create: [
          { ingredientId: "ing-farinha", qty: 0.210, unit: "kg" },
          { ingredientId: "ing-manteiga", qty: 0.100, unit: "kg" },
          { ingredientId: "ing-acucar-ref", qty: 0.060, unit: "kg" },
          { ingredientId: "ing-acucar-masc", qty: 0.120, unit: "kg" },
          { ingredientId: "ing-ovos", qty: 2, unit: "un" },
          { ingredientId: "ing-choc-meio", qty: 0.200, unit: "kg" },
          { ingredientId: "ing-sal", qty: 0.005, unit: "kg" },
        ],
      },
    },
  });
  // Cookie Niño — yield 18un, total cost R$19.40, cost/un R$1.078
  const recNino = await prisma.recipe.upsert({
    where: { id: "rec-nino" },
    update: {},
    create: {
      id: "rec-nino", name: "Cookie Niño", yield: 18, yieldUnit: "un",
      productId: prodNino.id, totalCost: 19.40,
      ingredients: {
        create: [
          { ingredientId: "ing-farinha", qty: 0.100, unit: "kg" },
          { ingredientId: "ing-manteiga", qty: 0.100, unit: "kg" },
          { ingredientId: "ing-leite-ninho", qty: 0.100, unit: "kg" },
          { ingredientId: "ing-acucar-ref", qty: 0.050, unit: "kg" },
          { ingredientId: "ing-ovos", qty: 1, unit: "un" },
          { ingredientId: "ing-choc-branco", qty: 0.150, unit: "kg" },
        ],
      },
    },
  });
  // Cookie 3 Chocolates — yield 18un, total cost R$21.03, cost/un R$1.168
  const rec3Choc = await prisma.recipe.upsert({
    where: { id: "rec-3choc" },
    update: {},
    create: {
      id: "rec-3choc", name: "Cookie 3 Chocolates", yield: 18, yieldUnit: "un",
      productId: prod3Choc.id, totalCost: 21.03,
      ingredients: {
        create: [
          { ingredientId: "ing-farinha", qty: 0.220, unit: "kg" },
          { ingredientId: "ing-manteiga", qty: 0.150, unit: "kg" },
          { ingredientId: "ing-acucar-masc", qty: 0.080, unit: "kg" },
          { ingredientId: "ing-ovos", qty: 1, unit: "un" },
          { ingredientId: "ing-choc-mix", qty: 0.210, unit: "kg" },
          { ingredientId: "ing-choc-cobertura", qty: 0.040, unit: "kg" },
        ],
      },
    },
  });
  console.log("  ✅ Recipes (3)");

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
          { productId: prodClassico.id, qty: 1, price: 10 }, // congelado
          { productId: prodNino.id, qty: 7, price: 13 },
          { productId: prodNino.id, qty: 1, price: 10 }, // congelado
          { productId: prod3Choc.id, qty: 14, price: 15 },
          { productId: prod3Choc.id, qty: 2, price: 10 }, // congelado
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
          { productId: prodClassico.id, qty: 1, price: 10 },
          { productId: prodNino.id, qty: 7, price: 13 },
          { productId: prodNino.id, qty: 1, price: 10 },
          { productId: prod3Choc.id, qty: 14, price: 15 },
          { productId: prod3Choc.id, qty: 2, price: 10 },
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
