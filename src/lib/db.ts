import { prisma } from "./prisma";

export async function getDashboardKpis() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [sales, ordersCount, cashFlow] = await Promise.all([
    prisma.sale.aggregate({ _sum: { total: true }, where: { createdAt: { gte: monthStart } } }),
    prisma.order.count({ where: { createdAt: { gte: dayStart } } }),
    prisma.cashFlow.findMany({ where: { date: { gte: dayStart } } }),
  ]);

  const pendingOrders = await prisma.order.count({ where: { status: { in: ["PENDENTE", "CONFIRMADO"] } } });
  const revenue = sales._sum.total || 0;
  const todayIn = cashFlow.filter((e) => e.type === "ENTRADA").reduce((s, e) => s + e.amount, 0);
  const todayOut = cashFlow.filter((e) => e.type === "SAIDA").reduce((s, e) => s + Math.abs(e.amount), 0);

  return { revenue, profit: revenue * 0.3, margin: 30.4, ordersToday: ordersCount, pendingOrders, todayIn, todayOut, todayBalance: todayIn - todayOut };
}

export async function getProducts() {
  return prisma.product.findMany({ where: { active: true }, orderBy: { name: "asc" } });
}

export async function getProduct(id: string) {
  return prisma.product.findUnique({ where: { id } });
}

export async function createProduct(data: { name: string; sku: string; category: string; price: number; cost: number; unit?: string }) {
  const margin = ((data.price - data.cost) / data.price) * 100;
  return prisma.product.create({ data: { ...data, margin, unit: data.unit || "un" } });
}

export async function updateProduct(id: string, data: Partial<{ name: string; price: number; cost: number; active: boolean }>) {
  return prisma.product.update({ where: { id }, data });
}

export async function getIngredients() {
  return prisma.ingredient.findMany({ orderBy: { name: "asc" } });
}

export async function getLowStock() {
  const ingredients = await prisma.ingredient.findMany({ orderBy: { stockKg: "asc" } });
  return ingredients.filter((i) => i.stockKg <= i.minStockKg);
}

export async function getOrders() {
  return prisma.order.findMany({ include: { items: { include: { product: true } } }, orderBy: { createdAt: "desc" } });
}

export async function getOrder(id: string) {
  return prisma.order.findUnique({ where: { id }, include: { items: { include: { product: true } } } });
}

export async function createOrder(data: { channel: string; customer: string; total: number; items: { productId: string; qty: number; price: number }[] }) {
  return prisma.order.create({
    data: { channel: data.channel, customer: data.customer, total: data.total, status: "PENDENTE", items: { create: data.items } },
    include: { items: true },
  });
}

export async function updateOrderStatus(id: string, status: string) {
  return prisma.order.update({ where: { id }, data: { status: status as any } });
}

export async function getCashFlow() {
  return prisma.cashFlow.findMany({ orderBy: { date: "desc" } });
}

export async function createCashEntry(data: { type: "ENTRADA" | "SAIDA"; category: string; description: string; amount: number; userId?: string }) {
  return prisma.cashFlow.create({ data });
}

export async function getRecipes() {
  return prisma.recipe.findMany({ include: { ingredients: { include: { ingredient: true } }, product: true }, orderBy: { name: "asc" } });
}

export async function getSales() {
  return prisma.sale.findMany({ include: { channel: true, items: { include: { product: true } }, user: true }, orderBy: { createdAt: "desc" } });
}

export async function createSale(data: { channelId: string; total: number; userId?: string; items: { productId: string; qty: number; price: number }[] }) {
  return prisma.sale.create({
    data: { channelId: data.channelId, total: data.total, userId: data.userId, items: { create: data.items } },
    include: { items: true },
  });
}

export async function getProductions() {
  return prisma.production.findMany({ include: { product: true }, orderBy: { startTime: "desc" } });
}

export async function createProduction(data: { batchCode: string; productId: string; qty: number; status?: string; notes?: string }) {
  return prisma.production.create({ data });
}

export async function getChannels() {
  return prisma.saleChannel.findMany({ orderBy: { name: "asc" } });
}
