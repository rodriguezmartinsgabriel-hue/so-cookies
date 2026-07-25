import { prisma } from "./prisma";

export async function getDashboardKpis() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [sales, ordersCount, cashFlow, pendingOrders, monthSales] = await Promise.all([
    prisma.sale.aggregate({ _sum: { total: true }, where: { createdAt: { gte: monthStart } } }),
    prisma.order.count({ where: { createdAt: { gte: dayStart } } }),
    prisma.cashFlow.findMany({ where: { date: { gte: dayStart } } }),
    prisma.order.count({ where: { status: { in: ["PENDENTE"] } } }),
    prisma.sale.findMany({ where: { createdAt: { gte: monthStart } }, include: { items: { include: { product: true } } } }),
  ]);

  const revenue = sales._sum.total || 0;
  const todayIn = cashFlow.filter((e) => e.type === "ENTRADA").reduce((s, e) => s + e.amount, 0);
  const todayOut = cashFlow.filter((e) => e.type === "SAIDA").reduce((s, e) => s + Math.abs(e.amount), 0);

  let totalCost = 0;
  monthSales.forEach((sale) => {
    sale.items.forEach((item) => {
      totalCost += (item.product.cost || 0) * item.qty;
    });
  });
  const profit = revenue - totalCost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  return { revenue, profit, margin, ordersToday: ordersCount, pendingOrders, todayIn, todayOut, todayBalance: todayIn - todayOut };
}

export async function getProducts() {
  return prisma.product.findMany({ where: { active: true }, orderBy: { name: "asc" } });
}

export async function getAllProducts() {
  return prisma.product.findMany({ orderBy: { name: "asc" } });
}

export async function getProduct(id: string) {
  return prisma.product.findUnique({ where: { id } });
}

export async function createProduct(data: { name: string; sku: string; category: string; price: number; cost: number; unit?: string }) {
  const margin = data.price > 0 ? ((data.price - data.cost) / data.price) * 100 : 0;
  return prisma.product.create({ data: { ...data, margin, unit: data.unit || "un" } });
}

export async function updateProduct(id: string, data: Partial<{ name: string; price: number; cost: number; margin: number; active: boolean; category: string }>) {
  return prisma.product.update({ where: { id }, data });
}

export async function deleteProduct(id: string) {
  return prisma.product.delete({ where: { id } });
}

export async function getIngredients() {
  return prisma.ingredient.findMany({ orderBy: { name: "asc" } });
}

export async function getIngredient(id: string) {
  return prisma.ingredient.findUnique({ where: { id } });
}

export async function createIngredient(data: { name: string; brand?: string; stockKg?: number; minStockKg?: number; costPerKg: number; supplier: string; caloriesPer100g?: number; proteinPer100g?: number; carbsPer100g?: number; fatPer100g?: number }) {
  return prisma.ingredient.create({ data });
}

export async function updateIngredient(id: string, data: Partial<{ name: string; brand: string; stockKg: number; minStockKg: number; costPerKg: number; supplier: string; caloriesPer100g: number; proteinPer100g: number; carbsPer100g: number; fatPer100g: number }>) {
  return prisma.ingredient.update({ where: { id }, data });
}

export async function deleteIngredient(id: string) {
  return prisma.ingredient.delete({ where: { id } });
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

export async function createOrder(data: { channel: string; customer: string; total: number; notes?: string; items: { productId: string; qty: number; price: number }[] }) {
  return prisma.order.create({
    data: { channel: data.channel, customer: data.customer, total: data.total, notes: data.notes, status: "PENDENTE", items: { create: data.items } },
    include: { items: true },
  });
}

export async function updateOrderStatus(id: string, status: string) {
  const order = await prisma.order.update({ where: { id }, data: { status: status as any }, include: { items: true, sale: true } });
  if (status === "CONCLUIDO" && !order.sale) {
    await createSaleFromOrder(order);
  }
  return order;
}

export async function createSaleFromOrder(order: { id: string; channel: string; total: number; items: { productId: string; qty: number; price: number }[] }) {
  const channels = await prisma.saleChannel.findMany();
  const matchChannel = channels.find((c) => c.name.toLowerCase() === order.channel.toLowerCase());
  const channelId = matchChannel?.id || channels[0]?.id;
  if (!channelId) return null;
  return prisma.sale.create({
    data: {
      total: order.total,
      channelId,
      orderId: order.id,
      items: { create: order.items.map((item) => ({ productId: item.productId, qty: item.qty, price: item.price })) },
    },
    include: { items: true },
  });
}

export async function updateOrder(id: string, data: Partial<{ channel: string; customer: string; notes: string; status: string }>) {
  const updateData: Record<string, unknown> = {};
  if (data.channel) updateData.channel = data.channel;
  if (data.customer) updateData.customer = data.customer;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.status) updateData.status = data.status;
  return prisma.order.update({ where: { id }, data: updateData, include: { items: { include: { product: true } } } });
}

export async function deleteOrder(id: string) {
  return prisma.order.delete({ where: { id }, include: { items: true } });
}

export async function getCashFlow() {
  return prisma.cashFlow.findMany({ orderBy: { date: "desc" } });
}

export async function createCashEntry(data: { type: "ENTRADA" | "SAIDA"; category: string; description: string; amount: number; userId?: string; date?: string }) {
  return prisma.cashFlow.create({
    data: {
      ...data,
      amount: data.type === "SAIDA" ? -Math.abs(data.amount) : Math.abs(data.amount),
      date: data.date ? new Date(data.date) : new Date(),
    },
  });
}

export async function getCashEntry(id: string) {
  return prisma.cashFlow.findUnique({ where: { id } });
}

export async function updateCashEntry(id: string, data: Partial<{ type: "ENTRADA" | "SAIDA"; category: string; description: string; amount: number; date: string }>) {
  const updateData: Record<string, unknown> = {};
  if (data.type) {
    updateData.type = data.type;
    if (data.amount !== undefined) {
      updateData.amount = data.type === "SAIDA" ? -Math.abs(data.amount) : Math.abs(data.amount);
    }
  } else if (data.amount !== undefined) {
    updateData.amount = Math.abs(data.amount);
  }
  if (data.category) updateData.category = data.category;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.date) updateData.date = new Date(data.date);
  return prisma.cashFlow.update({ where: { id }, data: updateData });
}

export async function deleteCashEntry(id: string) {
  return prisma.cashFlow.delete({ where: { id } });
}

export async function getRecipes() {
  return prisma.recipe.findMany({ include: { ingredients: { include: { ingredient: true } }, product: true }, orderBy: { name: "asc" } });
}

export async function getRecipe(id: string) {
  return prisma.recipe.findUnique({ where: { id }, include: { ingredients: { include: { ingredient: true } }, product: true } });
}

export async function createRecipe(data: {
  name: string;
  yield: number;
  yieldUnit?: string;
  productId?: string;
  totalCost: number;
  ingredients: { ingredientId: string; qty: number; unit: string }[];
}) {
  return prisma.recipe.create({
    data: {
      name: data.name,
      yield: data.yield,
      yieldUnit: data.yieldUnit || "un",
      productId: data.productId,
      totalCost: data.totalCost,
      ingredients: { create: data.ingredients },
    },
    include: { ingredients: { include: { ingredient: true } } },
  });
}

export async function updateRecipe(id: string, data: {
  name?: string;
  yield?: number;
  yieldUnit?: string;
  productId?: string;
  totalCost?: number;
}) {
  return prisma.recipe.update({ where: { id }, data, include: { ingredients: { include: { ingredient: true } } } });
}

export async function deleteRecipe(id: string) {
  await prisma.recipeItem.deleteMany({ where: { recipeId: id } });
  return prisma.recipe.delete({ where: { id } });
}

export async function updateRecipeIngredients(recipeId: string, ingredients: { ingredientId: string; qty: number; unit: string }[]) {
  await prisma.recipeItem.deleteMany({ where: { recipeId } });
  return prisma.recipeItem.createMany({
    data: ingredients.map((ing) => ({ recipeId, ...ing })),
  });
}

export async function getSales() {
  return prisma.sale.findMany({ include: { channel: true, items: { include: { product: true } }, user: true }, orderBy: { createdAt: "desc" } });
}

export async function getSale(id: string) {
  return prisma.sale.findUnique({ where: { id }, include: { channel: true, items: { include: { product: true } }, user: true } });
}

export async function createSale(data: { channelId: string; total: number; userId?: string; items: { productId: string; qty: number; price: number }[] }) {
  return prisma.sale.create({
    data: { channelId: data.channelId, total: data.total, userId: data.userId, items: { create: data.items } },
    include: { items: true },
  });
}

export async function deleteSale(id: string) {
  await prisma.saleItem.deleteMany({ where: { saleId: id } });
  return prisma.sale.delete({ where: { id } });
}

export async function getProductions() {
  return prisma.production.findMany({ include: { product: true }, orderBy: { startTime: "desc" } });
}

export async function createProduction(data: { batchCode: string; productId: string; qty: number; status?: string; notes?: string }) {
  return prisma.production.create({ data });
}

export async function updateProduction(id: string, data: Partial<{ status: string; endTime: string; notes: string; qty: number }>) {
  const updateData: Record<string, unknown> = {};
  if (data.status) updateData.status = data.status;
  if (data.endTime) updateData.endTime = new Date(data.endTime);
  if (data.notes) updateData.notes = data.notes;
  if (data.qty) updateData.qty = data.qty;
  return prisma.production.update({ where: { id }, data: updateData });
}

export async function deleteProduction(id: string) {
  return prisma.production.delete({ where: { id } });
}

export async function getChannels() {
  return prisma.saleChannel.findMany({ orderBy: { name: "asc" } });
}

export async function createChannel(data: { name: string; commission?: number }) {
  return prisma.saleChannel.create({ data });
}

export async function updateChannel(id: string, data: Partial<{ name: string; commission: number }>) {
  return prisma.saleChannel.update({ where: { id }, data });
}

export async function deleteChannel(id: string) {
  return prisma.saleChannel.delete({ where: { id } });
}

export async function getDeliveryCosts() {
  return prisma.deliveryCost.findMany({ orderBy: { date: "desc" } });
}

export async function createDeliveryCost(data: { channel: string; amount: number; orderId?: string; notes?: string; date?: string }) {
  return prisma.deliveryCost.create({
    data: { ...data, date: data.date ? new Date(data.date) : new Date() },
  });
}

export async function updateDeliveryCost(id: string, data: Partial<{ channel: string; amount: number; orderId: string; notes: string; date: string }>) {
  const updateData: Record<string, unknown> = { ...data };
  if (data.date) updateData.date = new Date(data.date);
  return prisma.deliveryCost.update({ where: { id }, data: updateData });
}

export async function deleteDeliveryCost(id: string) {
  return prisma.deliveryCost.delete({ where: { id } });
}

export async function getPriceTiers() {
  return prisma.priceTier.findMany({ include: { product: true }, orderBy: { minQty: "asc" } });
}

export async function createPriceTier(data: { productId: string; name: string; minQty: number; maxQty?: number; price: number }) {
  return prisma.priceTier.create({ data });
}

export async function updatePriceTier(id: string, data: Partial<{ name: string; minQty: number; maxQty: number; price: number }>) {
  return prisma.priceTier.update({ where: { id }, data });
}

export async function deletePriceTier(id: string) {
  return prisma.priceTier.delete({ where: { id } });
}
