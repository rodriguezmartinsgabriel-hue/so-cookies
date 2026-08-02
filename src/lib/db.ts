import { prisma } from "./prisma";
import type { Role, ContactType, InteractionType, DocumentCategory } from "@/generated/prisma/enums";
import { pushOrderStatusToPlatform } from "./integrations/push";
import { computeMargin } from "./utils";

export function isNotFoundError(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && e.code === "P2025";
}

export function isConstraintError(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e.code === "P2002" || e.code === "P2003");
}

export async function getDashboardKpis() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [sales, ordersCount, cashFlow, pendingOrders, monthSales, deliveryOrders] = await Promise.all([
    prisma.sale.aggregate({ _sum: { total: true }, where: { createdAt: { gte: monthStart } } }),
    prisma.order.count({ where: { createdAt: { gte: dayStart } } }),
    prisma.cashFlow.findMany({ where: { date: { gte: dayStart } } }),
    prisma.order.count({ where: { status: { in: ["PENDENTE"] } } }),
    prisma.sale.findMany({ where: { createdAt: { gte: monthStart } }, include: { items: { include: { product: true } } } }),
    prisma.order.findMany({
      where: { platform: { not: null }, status: "CONCLUIDO", createdAt: { gte: monthStart } },
      select: { total: true, platformFee: true },
    }),
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

  const deliveryRevenue = deliveryOrders.reduce((s, o) => s + o.total - (o.platformFee || 0), 0);
  const deliveryFees = deliveryOrders.reduce((s, o) => s + (o.platformFee || 0), 0);

  return { revenue, profit, margin, ordersToday: ordersCount, pendingOrders, todayIn, todayOut, todayBalance: todayIn - todayOut, deliveryRevenue, deliveryFees };
}

export async function getProducts() {
  return prisma.product.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } });
}

export async function getAllProducts() {
  return prisma.product.findMany({ orderBy: { name: "asc" } });
}

export async function getProduct(id: string) {
  return prisma.product.findUnique({ where: { id } });
}

export async function createProduct(data: { name: string; sku: string; category: string; price: number; cost: number; unit?: string; image?: string | null; active?: boolean }) {
  return prisma.product.create({
    data: {
      name: data.name,
      sku: data.sku,
      category: data.category,
      price: data.price,
      cost: data.cost,
      margin: computeMargin(data.price, data.cost),
      unit: data.unit || "un",
      image: data.image ?? null,
      active: data.active ?? true,
    },
  });
}

export async function updateProduct(id: string, data: Partial<{ name: string; sku: string; price: number; cost: number; margin: number; active: boolean; category: string; unit: string; image: string | null }>) {
  const patch: Record<string, unknown> = { ...data };
  if (data.image !== undefined) patch.image = data.image;
  if ((typeof data.price === "number" || typeof data.cost === "number") && data.margin === undefined) {
    const existing = await prisma.product.findUnique({ where: { id }, select: { price: true, cost: true } });
    if (existing) {
      patch.margin = computeMargin(data.price ?? existing.price, data.cost ?? existing.cost);
    }
  }
  return prisma.product.update({ where: { id }, data: patch });
}

export async function deleteProduct(id: string) {
  return prisma.product.update({ where: { id }, data: { active: false, deletedAt: new Date() } });
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

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

async function createSaleForOrder(
  tx: Tx,
  order: { id: string; channel: string; total: number; items: { productId: string | null; qty: number; price: number }[] },
) {
  const channels = await tx.saleChannel.findMany()
  const matchChannel = channels.find((c) => c.name.toLowerCase() === order.channel.toLowerCase())
  const channelId = matchChannel?.id || channels[0]?.id
  if (!channelId) return null
  const saleItems = order.items.filter((item): item is { productId: string; qty: number; price: number } => Boolean(item.productId))
  if (saleItems.length === 0) return null
  return tx.sale.create({
    data: {
      total: order.total,
      channelId,
      orderId: order.id,
      items: { create: saleItems.map((item) => ({ productId: item.productId, qty: item.qty, price: item.price })) },
    },
  })
}

export async function applyOrderUpdate(id: string, data: Partial<{ channel: string; customer: string; notes: string; status: string }>) {
  const order = await prisma.$transaction(async (tx) => {
    const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() }
    const updated = await tx.order.update({
      where: { id },
      data: updateData,
      include: { items: true, sale: true },
    })
    if (data.status === "CONCLUIDO" && !updated.sale && !updated.platform) {
      await createSaleForOrder(tx, updated)
    }
    return updated
  })

  let pushStatus: "ok" | "error" | null = null
  if (order.platform && data.status) {
    try {
      await pushOrderStatusToPlatform(order.id)
      pushStatus = "ok"
    } catch {
      pushStatus = "error"
    }
  }

  return { ...order, pushStatus }
}

export async function updateOrder(id: string, data: Partial<{ channel: string; customer: string; notes: string; status: string }>) {
  const updateData: Record<string, unknown> = {}
  if (data.channel) updateData.channel = data.channel
  if (data.customer) updateData.customer = data.customer
  if (data.notes !== undefined) updateData.notes = data.notes
  if (data.status) updateData.status = data.status
  return prisma.order.update({ where: { id }, data: updateData, include: { items: { include: { product: true } } } })
}

export async function deleteOrder(id: string) {
  return prisma.order.delete({ where: { id }, include: { items: true } })
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
  await prisma.$transaction(async (tx) => {
    await tx.recipeItem.deleteMany({ where: { recipeId } })
    await tx.recipeItem.createMany({
      data: ingredients.map((ing) => ({ recipeId, ...ing })),
    })
  })
}

const userSafeSelect = { id: true, name: true, email: true, role: true }

export async function getSales() {
  return prisma.sale.findMany({ include: { channel: true, items: { include: { product: true } }, user: { select: userSafeSelect } }, orderBy: { createdAt: "desc" } });
}

export async function getSale(id: string) {
  return prisma.sale.findUnique({ where: { id }, include: { channel: true, items: { include: { product: true } }, user: { select: userSafeSelect } } });
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

export async function getDocuments(category?: string) {
  const where = category && category !== "ALL" ? { category: category as DocumentCategory } : {};
  return prisma.document.findMany({ where, include: { user: { select: userSafeSelect } }, orderBy: { createdAt: "desc" } });
}

export async function getDocument(id: string) {
  return prisma.document.findUnique({ where: { id }, include: { user: { select: userSafeSelect } } });
}

export async function createDocument(data: {
  title: string;
  description?: string;
  category: string;
  content?: string;
  fileUrl?: string;
  tags?: string;
  userId?: string;
}) {
  return prisma.document.create({ data: { ...data, category: data.category as DocumentCategory } });
}

export async function updateDocument(id: string, data: Partial<{
  title: string;
  description: string;
  category: string;
  content: string;
  fileUrl: string;
  tags: string;
}>) {
  const updateData: Record<string, unknown> = {};
  if (data.title) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.category) updateData.category = data.category;
  if (data.content !== undefined) updateData.content = data.content;
  if (data.fileUrl !== undefined) updateData.fileUrl = data.fileUrl;
  if (data.tags !== undefined) updateData.tags = data.tags;
  return prisma.document.update({ where: { id }, data: updateData });
}

export async function deleteDocument(id: string) {
  return prisma.document.delete({ where: { id } });
}

export async function getUsers() {
  return prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { name: "asc" },
  });
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function createUser(data: { name: string; email: string; password: string; role: Role }) {
  return prisma.user.create({ data });
}

export async function updateUser(id: string, data: Partial<{ name: string; role: Role; password: string }>) {
  return prisma.user.update({ where: { id }, data });
}

export async function deleteUser(id: string) {
  return prisma.user.delete({ where: { id } });
}

export async function getContacts(search?: string, type?: string) {
  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { company: { contains: search, mode: "insensitive" } },
    ];
  }
  if (type && type !== "ALL") where.type = type;
  return prisma.contact.findMany({
    where,
    include: { interactions: { orderBy: { createdAt: "desc" } } },
    orderBy: { name: "asc" },
  });
}

export async function getContact(id: string) {
  return prisma.contact.findUnique({
    where: { id },
    include: { interactions: { orderBy: { createdAt: "desc" } } },
  });
}

export async function createContact(data: {
  name: string;
  email?: string;
  phone?: string;
  type?: ContactType;
  company?: string;
  notes?: string;
}) {
  return prisma.contact.create({
    data: {
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      type: data.type || "CLIENTE",
      company: data.company || null,
      notes: data.notes || null,
    },
    include: { interactions: { orderBy: { createdAt: "desc" } } },
  });
}

export async function updateContact(id: string, data: Partial<{
  name: string;
  email: string;
  phone: string;
  type: ContactType;
  company: string;
  notes: string;
}>) {
  const patch: Record<string, unknown> = {};
  if (data.name) patch.name = data.name;
  if (data.email !== undefined) patch.email = data.email || null;
  if (data.phone !== undefined) patch.phone = data.phone || null;
  if (data.type) patch.type = data.type;
  if (data.company !== undefined) patch.company = data.company || null;
  if (data.notes !== undefined) patch.notes = data.notes || null;
  return prisma.contact.update({ where: { id }, data: patch, include: { interactions: { orderBy: { createdAt: "desc" } } } });
}

export async function deleteContact(id: string) {
  await prisma.contactInteraction.deleteMany({ where: { contactId: id } });
  return prisma.contact.delete({ where: { id } });
}

export async function getContactInteractions(contactId: string) {
  return prisma.contactInteraction.findMany({ where: { contactId }, orderBy: { createdAt: "desc" } });
}

export async function createContactInteraction(contactId: string, data: { type: InteractionType; note: string }) {
  return prisma.contactInteraction.create({ data: { contactId, type: data.type, note: data.note } });
}

export async function deleteContactInteraction(id: string) {
  return prisma.contactInteraction.delete({ where: { id } });
}
