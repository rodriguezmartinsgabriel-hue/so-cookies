import Dexie, { type EntityTable } from "dexie"

export interface LocalOrder {
  id: string
  channel: string
  customer: string
  total: number
  status: string
  notes?: string
  createdAt: string
  updatedAt: string
  _synced: boolean
  _updatedAt: string
}

export interface LocalOrderItem {
  id: string
  orderId: string
  productId: string
  qty: number
  price: number
  _synced: boolean
}

export interface LocalSale {
  id: string
  channelId: string
  total: number
  userId?: string
  createdAt: string
  _synced: boolean
  _updatedAt: string
}

export interface LocalSaleItem {
  id: string
  saleId: string
  productId: string
  qty: number
  price: number
  _synced: boolean
}

export interface LocalCashFlow {
  id: string
  type: "ENTRADA" | "SAIDA"
  category: string
  description: string
  amount: number
  userId?: string
  date: string
  _synced: boolean
  _updatedAt: string
}

export interface LocalProduction {
  id: string
  batchCode: string
  productId: string
  qty: number
  startTime: string
  endTime?: string
  status: string
  notes?: string
  _synced: boolean
  _updatedAt: string
}

export interface LocalProduct {
  id: string
  name: string
  sku: string
  category: string
  price: number
  cost: number
  margin: number
  unit: string
  active: boolean
  _synced: boolean
}

export interface LocalIngredient {
  id: string
  name: string
  brand?: string
  stockKg: number
  minStockKg: number
  costPerKg: number
  supplier: string
  lastPurchase?: string
  caloriesPer100g?: number
  proteinPer100g?: number
  carbsPer100g?: number
  fatPer100g?: number
  _synced: boolean
  _updatedAt: string
}

export interface LocalChannel {
  id: string
  name: string
  commission: number
  _synced: boolean
  _updatedAt: string
}

export interface LocalPriceTier {
  id: string
  name: string
  minQty: number
  maxQty?: number
  price: number
  productId?: string
  _synced: boolean
  _updatedAt: string
}

export interface LocalRecipe {
  id: string
  name: string
  yield: number
  yieldUnit: string
  totalCost: number
  productId?: string
  preparation?: string
  image?: string
  ingredients: string
  createdAt: string
  updatedAt: string
  _synced: boolean
  _updatedAt: string
}

export interface LocalRecipeItem {
  id: string
  recipeId: string
  ingredientId: string
  qty: number
  unit: string
  _synced: boolean
}

export interface LocalDocument {
  id: string
  title: string
  description?: string
  category: string
  content?: string
  fileUrl?: string | null
  tags?: string
  userId?: string
  createdAt: string
  updatedAt: string
  _synced: boolean
  _updatedAt: string
}

export interface LocalDeliveryCost {
  id: string
  date: string
  channel: string
  orderId?: string
  amount: number
  notes?: string
  createdAt: string
  _synced: boolean
  _updatedAt: string
}

export interface LocalContact {
  id: string
  name: string
  email?: string
  phone?: string
  type: string
  company?: string
  notes?: string
  createdAt: string
  updatedAt: string
  _synced: boolean
  _updatedAt: string
}

export interface LocalContactInteraction {
  id: string
  contactId: string
  type: string
  note: string
  createdAt: string
  _synced: boolean
  _updatedAt: string
}

export interface SyncQueueItem {
  id?: number
  action: "create" | "update" | "delete"
  entity: string
  data: Record<string, unknown>
  tempId?: string
  createdAt: string
  attempts?: number
  lastAttemptAt?: string
}

export interface SyncErrorItem {
  id?: number
  entity: string
  action: string
  error: string
  dropped: boolean
  createdAt: string
  itemKey?: string
}

const db = new Dexie("SoManagerDB") as Dexie & {
  orders: EntityTable<LocalOrder, "id">
  orderItems: EntityTable<LocalOrderItem, "id">
  sales: EntityTable<LocalSale, "id">
  saleItems: EntityTable<LocalSaleItem, "id">
  cashFlow: EntityTable<LocalCashFlow, "id">
  productions: EntityTable<LocalProduction, "id">
  products: EntityTable<LocalProduct, "id">
  ingredients: EntityTable<LocalIngredient, "id">
  channels: EntityTable<LocalChannel, "id">
  priceTiers: EntityTable<LocalPriceTier, "id">
  recipes: EntityTable<LocalRecipe, "id">
  recipeItems: EntityTable<LocalRecipeItem, "id">
  documents: EntityTable<LocalDocument, "id">
  deliveryCosts: EntityTable<LocalDeliveryCost, "id">
  contacts: EntityTable<LocalContact, "id">
  contactInteractions: EntityTable<LocalContactInteraction, "id">
  syncQueue: EntityTable<SyncQueueItem, "id">
  syncMeta: EntityTable<{ key: string; value: string }, "key">
  syncErrors: EntityTable<SyncErrorItem, "id">
}

db.version(1).stores({
  orders: "id, status, _synced, createdAt",
  orderItems: "id, orderId, _synced",
  sales: "id, _synced, createdAt",
  saleItems: "id, saleId, _synced",
  cashFlow: "id, _synced, date",
  productions: "id, _synced, startTime",
  products: "id, _synced",
  syncQueue: "++id, entity, createdAt",
  syncMeta: "key",
})

db.version(2).stores({
  orders: "id, status, _synced, createdAt",
  orderItems: "id, orderId, _synced",
  sales: "id, _synced, createdAt",
  saleItems: "id, saleId, _synced",
  cashFlow: "id, _synced, date",
  productions: "id, _synced, startTime",
  products: "id, _synced",
  syncQueue: "++id, entity, createdAt",
  syncMeta: "key",
  ingredients: "id, _synced",
  channels: "id, _synced",
  priceTiers: "id, _synced, productId",
  recipes: "id, _synced",
  recipeItems: "id, recipeId, _synced",
  documents: "id, _synced, category",
  deliveryCosts: "id, _synced, date",
})

db.version(3).stores({
  orders: "id, status, _synced, createdAt",
  orderItems: "id, orderId, _synced",
  sales: "id, _synced, createdAt",
  saleItems: "id, saleId, _synced",
  cashFlow: "id, _synced, date",
  productions: "id, _synced, startTime",
  products: "id, _synced",
  syncQueue: "++id, entity, createdAt",
  syncMeta: "key",
  ingredients: "id, _synced",
  channels: "id, _synced",
  priceTiers: "id, _synced, productId",
  recipes: "id, _synced",
  recipeItems: "id, recipeId, _synced",
  documents: "id, _synced, category",
  deliveryCosts: "id, _synced, date",
  contacts: "id, _synced, type",
  contactInteractions: "id, contactId, _synced, createdAt",
})

db.version(4).stores({
  orders: "id, status, _synced, createdAt",
  orderItems: "id, orderId, _synced",
  sales: "id, _synced, createdAt",
  saleItems: "id, saleId, _synced",
  cashFlow: "id, _synced, date",
  productions: "id, _synced, startTime",
  products: "id, _synced",
  syncQueue: "++id, entity, createdAt",
  syncMeta: "key",
  ingredients: "id, _synced",
  channels: "id, _synced",
  priceTiers: "id, _synced, productId",
  recipes: "id, _synced",
  recipeItems: "id, recipeId, _synced",
  documents: "id, _synced, category",
  deliveryCosts: "id, _synced, date",
  contacts: "id, _synced, type",
  contactInteractions: "id, contactId, _synced, createdAt",
  syncErrors: "++id, createdAt",
})

export { db }

export async function getLastSyncTime(): Promise<string> {
  const meta = await db.syncMeta.get("lastPullAt")
  return meta?.value || "1970-01-01T00:00:00.000Z"
}

export async function setLastSyncTime(time: string) {
  await db.syncMeta.put({ key: "lastPullAt", value: time })
}

export async function addToSyncQueue(item: Omit<SyncQueueItem, "id">) {
  await db.syncQueue.add(item)
}

export async function clearSyncQueue() {
  await db.syncQueue.clear()
}

export async function getPendingSyncCount(): Promise<number> {
  return db.syncQueue.count()
}

const SYNC_ERRORS_CAP = 100

export async function addSyncError(data: { entity: string; action: string; error: string; dropped?: boolean; itemKey?: string }) {
  if (data.itemKey) {
    await clearSyncErrorsFor(data.itemKey)
  }
  await db.syncErrors.add({ ...data, dropped: data.dropped || false, createdAt: new Date().toISOString() })
  const count = await db.syncErrors.count()
  if (count > SYNC_ERRORS_CAP) {
    const oldest = await db.syncErrors.orderBy("id").limit(count - SYNC_ERRORS_CAP).toArray()
    await db.syncErrors.bulkDelete(oldest.map((r) => r.id!).filter((id): id is number => id !== undefined))
  }
}

export async function clearSyncErrorsFor(itemKey: string) {
  const rows = await db.syncErrors.filter((e) => e.itemKey === itemKey).toArray()
  if (rows.length) {
    await db.syncErrors.bulkDelete(rows.map((r) => r.id!).filter((id): id is number => id !== undefined))
  }
}

export async function discardQueued(itemKey: string) {
  const separator = itemKey.indexOf(":")
  const entity = separator === -1 ? itemKey : itemKey.slice(0, separator)
  const id = separator === -1 ? "" : itemKey.slice(separator + 1)
  await clearSyncErrorsFor(itemKey)
  if (!id) return
  const queued = await db.syncQueue.toArray()
  const stale = queued
    .filter((q) => q.entity === entity && (q.data?.id === id || q.tempId === id))
    .map((q) => q.id!)
    .filter((qid): qid is number => qid !== undefined)
  if (stale.length) await db.syncQueue.bulkDelete(stale)
}

export async function getSyncErrors(): Promise<SyncErrorItem[]> {
  return db.syncErrors.orderBy("id").reverse().limit(50).toArray()
}

export async function clearSyncErrors() {
  await db.syncErrors.clear()
}
