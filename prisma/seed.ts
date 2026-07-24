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

  const admin = await prisma.user.upsert({
    where: { email: "admin@socookies.com" },
    update: {},
    create: { name: "Admin", email: "admin@socookies.com", password: adminHash, role: "ADMIN" },
  });
  const operacional = await prisma.user.upsert({
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
  const channels = await Promise.all([
    prisma.saleChannel.upsert({ where: { id: "whatsapp" }, update: {}, create: { id: "whatsapp", name: "WhatsApp", commission: 0 } }),
    prisma.saleChannel.upsert({ where: { id: "ifood" }, update: {}, create: { id: "ifood", name: "iFood", commission: 0.23 } }),
    prisma.saleChannel.upsert({ where: { id: "rappi" }, update: {}, create: { id: "rappi", name: "Rappi", commission: 0.20 } }),
    prisma.saleChannel.upsert({ where: { id: "direto" }, update: {}, create: { id: "direto", name: "Direto", commission: 0 } }),
  ]);
  console.log("  ✅ Sale Channels (4)");

  // ─── Products ───────────────────────────────────────────────
  const productsData = [
    { id: "ck001", name: "Cookie Clássico", sku: "CK-001", category: "Cookie", price: 12, cost: 3.50, margin: 70.8 },
    { id: "ck002", name: "Cookie Chocolate Belga", sku: "CK-002", category: "Cookie", price: 14, cost: 4.20, margin: 70.0 },
    { id: "ck003", name: "Cookie Red Velvet", sku: "CK-003", category: "Cookie", price: 15, cost: 4.80, margin: 68.0 },
    { id: "ck004", name: "Cookie Nutella", sku: "CK-004", category: "Cookie", price: 16, cost: 5.50, margin: 65.6 },
    { id: "ck005", name: "Cookie Vegano", sku: "CK-005", category: "Cookie", price: 14, cost: 4.00, margin: 71.4 },
    { id: "br001", name: "Brownie Clássico", sku: "BR-001", category: "Brownie", price: 10, cost: 2.80, margin: 72.0 },
    { id: "br002", name: "Brownie Cremoso", sku: "BR-002", category: "Brownie", price: 12, cost: 3.60, margin: 70.0 },
    { id: "cb001", name: "Combo Cookie + Café", sku: "CB-001", category: "Cookie", price: 18, cost: 5.00, margin: 72.2, unit: "combo" },
    { id: "cf001", name: "Café Expresso", sku: "CF-001", category: "Café", price: 6, cost: 0.80, margin: 86.7 },
    { id: "cf002", name: "Café com Leite", sku: "CF-002", category: "Café", price: 8, cost: 1.50, margin: 81.3 },
    { id: "cf003", name: "Cold Brew", sku: "CF-003", category: "Bebida", price: 12, cost: 2.00, margin: 83.3 },
  ];

  const products = await Promise.all(
    productsData.map((p) =>
      prisma.product.upsert({ where: { sku: p.sku }, update: {}, create: p })
    )
  );
  console.log(`  ✅ Products (${products.length})`);

  // ─── Ingredients ─────────────────────────────────────────────
  const ingredientsData = [
    { id: "ing01", name: "Farinha de Trigo", stockKg: 15, minStockKg: 5, costPerKg: 6.50, supplier: "Forno & Cia" },
    { id: "ing02", name: "Manteiga", stockKg: 8, minStockKg: 3, costPerKg: 28.00, supplier: "Laticínios Sul" },
    { id: "ing03", name: "Açúcar Cristal", stockKg: 12, minStockKg: 4, costPerKg: 5.20, supplier: "Açúcar Bom" },
    { id: "ing04", name: "Chocolate em Pó", stockKg: 4, minStockKg: 2, costPerKg: 22.00, supplier: "Cacau Show" },
    { id: "ing05", name: "Chocolate Belga", stockKg: 3, minStockKg: 2, costPerKg: 55.00, supplier: "Callebaut" },
    { id: "ing06", name: "Ovos", stockKg: 6, minStockKg: 3, costPerKg: 18.00, supplier: "Granja Modelo" },
    { id: "ing07", name: "Nutella", stockKg: 2, minStockKg: 1, costPerKg: 60.00, supplier: "Ferrero" },
    { id: "ing08", name: "Café em Grãos", stockKg: 5, minStockKg: 2, costPerKg: 45.00, supplier: "Café do Campo" },
    { id: "ing09", name: "Leite", stockKg: 10, minStockKg: 5, costPerKg: 5.50, supplier: "Laticínios Sul" },
    { id: "ing10", name: "Fermento", stockKg: 1, minStockKg: 0.5, costPerKg: 15.00, supplier: "Forno & Cia" },
    { id: "ing11", name: "Aveia", stockKg: 3, minStockKg: 1, costPerKg: 12.00, supplier: "Natural Way" },
  ];

  const ingredients = await Promise.all(
    ingredientsData.map((i) =>
      prisma.ingredient.upsert({ where: { id: i.id }, update: {}, create: i })
    )
  );
  console.log(`  ✅ Ingredients (${ingredients.length})`);

  // ─── Recipes ─────────────────────────────────────────────────
  const recipesData = [
    {
      id: "rec01", name: "Cookie Clássico", yield: 12, yieldUnit: "un", productId: "ck001",
      items: [
        { ingredientId: "ing01", qty: 0.25, unit: "kg" },
        { ingredientId: "ing02", qty: 0.125, unit: "kg" },
        { ingredientId: "ing03", qty: 0.1, unit: "kg" },
        { ingredientId: "ing06", qty: 0.05, unit: "kg" },
        { ingredientId: "ing10", qty: 0.01, unit: "kg" },
      ],
      totalCost: 3.50,
    },
    {
      id: "rec02", name: "Cookie Chocolate Belga", yield: 12, yieldUnit: "un", productId: "ck002",
      items: [
        { ingredientId: "ing01", qty: 0.22, unit: "kg" },
        { ingredientId: "ing02", qty: 0.12, unit: "kg" },
        { ingredientId: "ing03", qty: 0.09, unit: "kg" },
        { ingredientId: "ing05", qty: 0.05, unit: "kg" },
        { ingredientId: "ing06", qty: 0.05, unit: "kg" },
        { ingredientId: "ing10", qty: 0.01, unit: "kg" },
      ],
      totalCost: 4.20,
    },
    {
      id: "rec03", name: "Brownie Clássico", yield: 16, yieldUnit: "un", productId: "br001",
      items: [
        { ingredientId: "ing04", qty: 0.2, unit: "kg" },
        { ingredientId: "ing02", qty: 0.15, unit: "kg" },
        { ingredientId: "ing03", qty: 0.2, unit: "kg" },
        { ingredientId: "ing06", qty: 0.15, unit: "kg" },
        { ingredientId: "ing01", qty: 0.1, unit: "kg" },
      ],
      totalCost: 2.80,
    },
  ];

  for (const r of recipesData) {
    const { items, ...recipeData } = r;
    await prisma.recipe.upsert({
      where: { id: recipeData.id },
      update: {},
      create: {
        ...recipeData,
        ingredients: {
          create: items.map((item) => ({
            ingredientId: item.ingredientId,
            qty: item.qty,
            unit: item.unit,
          })),
        },
      },
    });
  }
  console.log("  ✅ Recipes (3)");

  // ─── Sample Orders ───────────────────────────────────────────
  const ordersData = [
    { id: "ord001", channel: "iFood", customer: "Maria Silva", total: 68, status: "PENDENTE" as const, createdAt: new Date("2026-07-24T10:30:00"), items: [{ productId: "ck002", qty: 4, price: 14 }, { productId: "cf001", qty: 2, price: 6 }] },
    { id: "ord002", channel: "WhatsApp", customer: "João Santos", total: 102, status: "CONFIRMADO" as const, createdAt: new Date("2026-07-24T10:45:00"), items: [{ productId: "ck001", qty: 6, price: 12 }, { productId: "br001", qty: 3, price: 10 }] },
    { id: "ord003", channel: "Rappi", customer: "Ana Costa", total: 48, status: "PRODUCAO" as const, createdAt: new Date("2026-07-24T11:00:00"), items: [{ productId: "cb001", qty: 2, price: 18 }, { productId: "cf003", qty: 1, price: 12 }] },
    { id: "ord004", channel: "Direto", customer: "Pedro Lima", total: 192, status: "PRONTO" as const, createdAt: new Date("2026-07-24T09:30:00"), items: [{ productId: "ck004", qty: 12, price: 16 }] },
    { id: "ord005", channel: "iFood", customer: "Lucia Ferreira", total: 58, status: "ENTREGA" as const, createdAt: new Date("2026-07-24T11:15:00"), items: [{ productId: "ck005", qty: 3, price: 14 }, { productId: "cf002", qty: 2, price: 8 }] },
    { id: "ord006", channel: "WhatsApp", customer: "Carlos Souza", total: 60, status: "CONCLUIDO" as const, createdAt: new Date("2026-07-24T08:00:00"), items: [{ productId: "br002", qty: 5, price: 12 }] },
    { id: "ord007", channel: "Direto", customer: "Fernanda Alves", total: 120, status: "CONCLUIDO" as const, createdAt: new Date("2026-07-24T08:30:00"), items: [{ productId: "ck003", qty: 8, price: 15 }] },
  ];

  for (const o of ordersData) {
    const { items, ...orderData } = o;
    await prisma.order.upsert({
      where: { id: orderData.id },
      update: {},
      create: {
        ...orderData,
        items: { create: items },
      },
    });
  }
  console.log("  ✅ Orders (7)");

  // ─── Sample Cash Flow ────────────────────────────────────────
  const cashFlowData = [
    { type: "ENTRADA" as const, category: "Venda Direta", description: "Pedido #004 - Pedro Lima", amount: 192, userId: admin.id },
    { type: "ENTRADA" as const, category: "Venda iFood", description: "3 pedidos iFood", amount: 156, userId: admin.id },
    { type: "ENTRADA" as const, category: "Venda Rappi", description: "1 pedido Rappi", amount: 48, userId: admin.id },
    { type: "SAIDA" as const, category: "Compra Ingrediente", description: "Chocolate Belga - Callebaut", amount: -165, userId: admin.id },
    { type: "SAIDA" as const, category: "Frete", description: "Entrega Rappi", amount: -25, userId: admin.id },
    { type: "ENTRADA" as const, category: "Venda WhatsApp", description: "2 pedidos WhatsApp", amount: 204, userId: admin.id },
    { type: "SAIDA" as const, category: "Comissão iFood", description: "Comissão sobre vendas", amount: -72.50, userId: admin.id },
    { type: "SAIDA" as const, category: "Compra Ingrediente", description: "Farinha + Manteiga", amount: -98, userId: admin.id },
  ];

  for (const cf of cashFlowData) {
    await prisma.cashFlow.create({ data: cf });
  }
  console.log("  ✅ Cash Flow (8 lançamentos)\n");

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
