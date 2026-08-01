import { db, addToSyncQueue, getLastSyncTime } from "./db-local"
import { scheduleSync } from "./sync-service"
import { emitDataRefresh } from "./refresh-events"

export { onDataRefresh } from "./refresh-events"

const isOnline = () => navigator.onLine

function generateTempId() {
  return `offline_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function now() {
  return new Date().toISOString()
}

const fetchThrottle = new Map<string, number>()

function shouldFetch(url: string) {
  const now = Date.now()
  const last = fetchThrottle.get(url) || 0
  if (now - last < 2000) return false
  fetchThrottle.set(url, now)
  return true
}

async function getUnsyncedIds(table: { toArray(): Promise<{ id: string; _synced?: boolean }[]> }) {
  return new Set((await table.toArray()).filter((r) => r._synced === false).map((r) => r.id))
}

async function getQueuedIds() {
  const queued = await db.syncQueue.toArray()
  return new Set(queued.map((q) => (q.tempId || (q.data && (q.data.id as string))) as string).filter(Boolean))
}

async function mergeTable(
  table: any,
  url: string,
  options?: {
    transform?: (row: any) => any
    scope?: (row: any) => boolean
    onDelete?: (row: any) => Promise<void>
  },
) {
  const resp = await fetch(url)
  if (!resp.ok) return
  const data = await resp.json()
  const realIds = new Set(data.map((r: any) => r.id))
  const unsyncedIds = await getUnsyncedIds(table)
  const queuedIds = await getQueuedIds()

  const localRows = await table.toArray()
  for (const local of localRows) {
    if (realIds.has(local.id)) continue
    if (options?.scope && !options.scope(local)) continue
    if (unsyncedIds.has(local.id)) continue
    if (queuedIds.has(local.id)) continue
    await table.delete(local.id)
    if (options?.onDelete) await options.onDelete(local)
  }

  const toUpsert = data
    .filter((r: any) => !unsyncedIds.has(r.id))
    .map((r: any) => (options?.transform ? options.transform(r) : { ...r, _synced: true, _updatedAt: now() }))
  await table.bulkPut(toUpsert)
}

export const repository = {
  orders: {
    async getAll() {
      const cached = await db.orders.toArray()
      if (isOnline() && shouldFetch("/api/orders")) {
        mergeTable(db.orders, "/api/orders", {
          onDelete: async (o) => {
            await db.orderItems.where("orderId").equals(o.id).delete()
          },
        })
          .then(() => emitDataRefresh())
          .catch((e) => console.error("Erro ao sync orders:", e))
      }
      return cached
    },

    async create(data: { channel: string; customer: string; total: number; notes?: string; items: { productId: string; qty: number; price: number }[] }) {
      const id = generateTempId()
      const order = { ...data, id, status: "PENDENTE", createdAt: now(), updatedAt: now(), _updatedAt: now(), _synced: false }
      const items = data.items.map((item) => ({
        id: generateTempId(),
        orderId: id,
        ...item,
        _synced: false,
      }))

      await db.orders.add(order)
      await db.orderItems.bulkAdd(items)
      await addToSyncQueue({ action: "create", entity: "order", data: { ...order, items }, tempId: id, createdAt: now() })

      scheduleSync()
      return order
    },

    async update(id: string, data: { customer?: string; notes?: string }) {
      const updatedAt = now()
      await db.orders.update(id, { ...data, updatedAt, _synced: false })
      await addToSyncQueue({ action: "update", entity: "order", data: { id, ...data, updatedAt }, createdAt: now() })
      scheduleSync()
    },

    async updateStatus(id: string, status: string) {
      const updatedAt = now()
      await db.orders.update(id, { status, updatedAt, _synced: false })
      await addToSyncQueue({ action: "update", entity: "order", data: { id, status, updatedAt }, createdAt: now() })
      scheduleSync()
    },

    async delete(id: string) {
      await db.orders.delete(id)
      await db.orderItems.where("orderId").equals(id).delete()
      await addToSyncQueue({ action: "delete", entity: "order", data: { id }, createdAt: now() })
      scheduleSync()
    },
  },

  sales: {
    async getAll() {
      const cached = await db.sales.toArray()
      if (isOnline() && shouldFetch("/api/sales")) {
        mergeTable(db.sales, "/api/sales", {
          onDelete: async (s) => {
            await db.saleItems.where("saleId").equals(s.id).delete()
          },
        })
          .then(() => emitDataRefresh())
          .catch((e) => console.error("Erro ao sync:", e))
      }
      return cached
    },

    async create(data: { channelId: string; total: number; userId?: string; items: { productId: string; qty: number; price: number }[] }) {
      const id = generateTempId()
      const sale = { ...data, id, createdAt: now(), _synced: false, _updatedAt: now() }
      const items = data.items.map((item) => ({
        id: generateTempId(),
        saleId: id,
        ...item,
        _synced: false,
      }))

      await db.sales.add(sale)
      await db.saleItems.bulkAdd(items)
      await addToSyncQueue({ action: "create", entity: "sale", data: { ...sale, items }, tempId: id, createdAt: now() })

      scheduleSync()
      return sale
    },

    async delete(id: string) {
      await db.sales.delete(id)
      await db.saleItems.where("saleId").equals(id).delete()
      await addToSyncQueue({ action: "delete", entity: "sale", data: { id }, createdAt: now() })
      scheduleSync()
    },
  },

  cashFlow: {
    async getAll() {
      const cached = await db.cashFlow.toArray()
      if (isOnline() && shouldFetch("/api/cashflow")) {
        mergeTable(db.cashFlow, "/api/cashflow")
          .then(() => emitDataRefresh())
          .catch((e) => console.error("Erro ao sync:", e))
      }
      return cached
    },

    async create(data: { type: "ENTRADA" | "SAIDA"; category: string; description: string; amount: number; userId?: string; date?: string }) {
      const id = generateTempId()
      const entry = { ...data, id, date: data.date || now(), _synced: false, _updatedAt: now() }

      await db.cashFlow.add(entry)
      await addToSyncQueue({ action: "create", entity: "cashFlow", data: entry, tempId: id, createdAt: now() })

      scheduleSync()
      return entry
    },

    async update(id: string, data: { type?: "ENTRADA" | "SAIDA"; category?: string; description?: string; amount?: number; date?: string }) {
      const updatedAt = now()
      await db.cashFlow.update(id, { ...data, _synced: false, _updatedAt: updatedAt })
      await addToSyncQueue({ action: "update", entity: "cashFlow", data: { id, ...data }, createdAt: now() })
      scheduleSync()
    },

    async delete(id: string) {
      await db.cashFlow.delete(id)
      await addToSyncQueue({ action: "delete", entity: "cashFlow", data: { id }, createdAt: now() })
      scheduleSync()
    },
  },

  productions: {
    async getAll() {
      const cached = await db.productions.toArray()
      if (isOnline() && shouldFetch("/api/productions")) {
        mergeTable(db.productions, "/api/productions")
          .then(() => emitDataRefresh())
          .catch((e) => console.error("Erro ao sync:", e))
      }
      return cached
    },

    async create(data: { batchCode: string; productId: string; qty: number; status?: string; notes?: string }) {
      const id = generateTempId()
      const production = { ...data, id, startTime: now(), status: data.status || "pendente", _synced: false, _updatedAt: now() }

      await db.productions.add(production)
      await addToSyncQueue({ action: "create", entity: "production", data: production, tempId: id, createdAt: now() })

      scheduleSync()
      return production
    },

    async update(id: string, data: { status?: string; qty?: number; notes?: string; endTime?: string }) {
      const updatedAt = now()
      await db.productions.update(id, { ...data, _synced: false, _updatedAt: updatedAt })
      await addToSyncQueue({ action: "update", entity: "production", data: { id, ...data }, createdAt: now() })
      scheduleSync()
    },

    async updateStatus(id: string, status: string, endTime?: string) {
      const updates = { status, _synced: false, _updatedAt: now(), ...(endTime ? { endTime } : {}) }
      await db.productions.update(id, updates)
      await addToSyncQueue({ action: "update", entity: "production", data: { id, status, endTime }, createdAt: now() })
      scheduleSync()
    },

    async delete(id: string) {
      await db.productions.delete(id)
      await addToSyncQueue({ action: "delete", entity: "production", data: { id }, createdAt: now() })
      scheduleSync()
    },
  },

  products: {
    async getAll() {
      const cached = await db.products.toArray()
      if (isOnline() && shouldFetch("/api/products")) {
        fetch("/api/products")
          .then(async (resp) => {
            if (!resp.ok) return
            const data = await resp.json()
            await db.products.bulkPut(data.map((p: any) => ({ ...p, _synced: true })))
            emitDataRefresh()
          })
          .catch((e) => console.error("Erro ao sync:", e))
      }
      return cached
    },
  },

  ingredients: {
    async getAll() {
      const cached = await db.ingredients.toArray()
      if (isOnline() && shouldFetch("/api/ingredients")) {
        mergeTable(db.ingredients, "/api/ingredients")
          .then(() => emitDataRefresh())
          .catch((e) => console.error("Erro ao sync:", e))
      }
      return cached
    },

    async create(data: { name: string; brand?: string; stockKg?: number; minStockKg?: number; costPerKg: number; supplier: string; caloriesPer100g?: number; proteinPer100g?: number; carbsPer100g?: number; fatPer100g?: number }) {
      const id = generateTempId()
      const ingredient = { ...data, id, stockKg: data.stockKg ?? 0, minStockKg: data.minStockKg ?? 0, _synced: false, _updatedAt: now() }

      await db.ingredients.add(ingredient)
      await addToSyncQueue({ action: "create", entity: "ingredient", data: ingredient, tempId: id, createdAt: now() })

      scheduleSync()
      return ingredient
    },

    async update(id: string, data: { name?: string; brand?: string; stockKg?: number; minStockKg?: number; costPerKg?: number; supplier?: string; caloriesPer100g?: number; proteinPer100g?: number; carbsPer100g?: number; fatPer100g?: number }) {
      const updatedAt = now()
      await db.ingredients.update(id, { ...data, _synced: false, _updatedAt: updatedAt })
      await addToSyncQueue({ action: "update", entity: "ingredient", data: { id, ...data }, createdAt: now() })
      scheduleSync()
    },

    async delete(id: string) {
      await db.ingredients.delete(id)
      await addToSyncQueue({ action: "delete", entity: "ingredient", data: { id }, createdAt: now() })
      scheduleSync()
    },
  },

  channels: {
    async getAll() {
      const cached = await db.channels.toArray()
      if (isOnline() && shouldFetch("/api/channels")) {
        mergeTable(db.channels, "/api/channels")
          .then(() => emitDataRefresh())
          .catch((e) => console.error("Erro ao sync:", e))
      }
      return cached
    },

    async create(data: { name: string; commission?: number }) {
      const id = generateTempId()
      const channel = { ...data, id, commission: data.commission || 0, _synced: false, _updatedAt: now() }

      await db.channels.add(channel)
      await addToSyncQueue({ action: "create", entity: "channel", data: channel, tempId: id, createdAt: now() })

      scheduleSync()
      return channel
    },

    async update(id: string, data: { name?: string; commission?: number }) {
      const updatedAt = now()
      await db.channels.update(id, { ...data, _synced: false, _updatedAt: updatedAt })
      await addToSyncQueue({ action: "update", entity: "channel", data: { id, ...data }, createdAt: now() })
      scheduleSync()
    },

    async delete(id: string) {
      await db.channels.delete(id)
      await addToSyncQueue({ action: "delete", entity: "channel", data: { id }, createdAt: now() })
      scheduleSync()
    },
  },

  priceTiers: {
    async getAll() {
      const cached = await db.priceTiers.toArray()
      if (isOnline() && shouldFetch("/api/price-tiers")) {
        mergeTable(db.priceTiers, "/api/price-tiers")
          .then(() => emitDataRefresh())
          .catch((e) => console.error("Erro ao sync:", e))
      }
      return cached
    },

    async create(data: { name: string; minQty: number; maxQty?: number; price: number; productId?: string }) {
      const id = generateTempId()
      const tier = { ...data, id, _synced: false, _updatedAt: now() }

      await db.priceTiers.add(tier)
      await addToSyncQueue({ action: "create", entity: "priceTier", data: tier, tempId: id, createdAt: now() })

      scheduleSync()
      return tier
    },

    async update(id: string, data: { name?: string; minQty?: number; maxQty?: number; price?: number; productId?: string }) {
      const updatedAt = now()
      await db.priceTiers.update(id, { ...data, _synced: false, _updatedAt: updatedAt })
      await addToSyncQueue({ action: "update", entity: "priceTier", data: { id, ...data }, createdAt: now() })
      scheduleSync()
    },

    async delete(id: string) {
      await db.priceTiers.delete(id)
      await addToSyncQueue({ action: "delete", entity: "priceTier", data: { id }, createdAt: now() })
      scheduleSync()
    },
  },

  recipes: {
    async getAll() {
      const cached = (await db.recipes.toArray()).map((r) => ({ ...r, ingredients: JSON.parse(r.ingredients) }))
      if (isOnline() && shouldFetch("/api/recipes")) {
        mergeTable(db.recipes, "/api/recipes", {
          transform: (r: any) => ({ ...r, ingredients: JSON.stringify(r.ingredients || []), _synced: true, _updatedAt: now() }),
          onDelete: async (r) => {
            await db.recipeItems.where("recipeId").equals(r.id).delete()
          },
        })
          .then(() => emitDataRefresh())
          .catch((e) => console.error("Erro ao sync:", e))
      }
      return cached
    },

    async create(data: { name: string; yield: number; yieldUnit?: string; totalCost?: number; productId?: string; ingredients: { ingredientId: string; qty: number; unit: string }[] }) {
      const id = generateTempId()
      const recipe = {
        ...data,
        id,
        yieldUnit: data.yieldUnit || "un",
        totalCost: data.totalCost || 0,
        ingredients: JSON.stringify(data.ingredients || []),
        createdAt: now(),
        updatedAt: now(),
        _synced: false,
        _updatedAt: now(),
      }
      const items = (data.ingredients || []).map((item) => ({
        id: generateTempId(),
        recipeId: id,
        ...item,
        _synced: false,
      }))

      await db.recipes.add(recipe)
      if (items.length) await db.recipeItems.bulkAdd(items)
      await addToSyncQueue({ action: "create", entity: "recipe", data: { ...data, id }, tempId: id, createdAt: now() })

      scheduleSync()
      return { ...recipe, ingredients: JSON.parse(recipe.ingredients) }
    },

    async update(id: string, data: { name?: string; yield?: number; yieldUnit?: string; totalCost?: number; productId?: string; ingredients?: { ingredientId: string; qty: number; unit: string }[] }) {
      const updatedAt = now()
      const patch: any = { ...data, _synced: false, _updatedAt: updatedAt }
      if (data.ingredients) patch.ingredients = JSON.stringify(data.ingredients)
      await db.recipes.update(id, patch)
      await addToSyncQueue({ action: "update", entity: "recipe", data: { id, ...data }, createdAt: now() })
      scheduleSync()
    },

    async delete(id: string) {
      await db.recipes.delete(id)
      await db.recipeItems.where("recipeId").equals(id).delete()
      await addToSyncQueue({ action: "delete", entity: "recipe", data: { id }, createdAt: now() })
      scheduleSync()
    },
  },

  documents: {
    async getAll() {
      const cached = await db.documents.toArray()
      if (isOnline() && shouldFetch("/api/documents")) {
        mergeTable(db.documents, "/api/documents")
          .then(() => emitDataRefresh())
          .catch((e) => console.error("Erro ao sync:", e))
      }
      return cached
    },

    async create(data: { title: string; description?: string; category: string; content?: string; fileUrl?: string; tags?: string; userId?: string }) {
      const id = generateTempId()
      const doc = { ...data, id, createdAt: now(), updatedAt: now(), _synced: false, _updatedAt: now() }

      await db.documents.add(doc)
      await addToSyncQueue({ action: "create", entity: "document", data: doc, tempId: id, createdAt: now() })

      scheduleSync()
      return doc
    },

    async update(id: string, data: { title?: string; description?: string; category?: string; content?: string; fileUrl?: string; tags?: string }) {
      const updatedAt = now()
      await db.documents.update(id, { ...data, _synced: false, _updatedAt: updatedAt })
      await addToSyncQueue({ action: "update", entity: "document", data: { id, ...data }, createdAt: now() })
      scheduleSync()
    },

    async delete(id: string) {
      await db.documents.delete(id)
      await addToSyncQueue({ action: "delete", entity: "document", data: { id }, createdAt: now() })
      scheduleSync()
    },
  },

  deliveryCosts: {
    async getAll() {
      const cached = await db.deliveryCosts.toArray()
      if (isOnline() && shouldFetch("/api/delivery-cost")) {
        mergeTable(db.deliveryCosts, "/api/delivery-cost")
          .then(() => emitDataRefresh())
          .catch((e) => console.error("Erro ao sync:", e))
      }
      return cached
    },

    async create(data: { date?: string; channel: string; orderId?: string; amount: number; notes?: string }) {
      const id = generateTempId()
      const cost = { ...data, id, date: data.date || now(), createdAt: now(), _synced: false, _updatedAt: now() }

      await db.deliveryCosts.add(cost)
      await addToSyncQueue({ action: "create", entity: "deliveryCost", data: cost, tempId: id, createdAt: now() })

      scheduleSync()
      return cost
    },

    async update(id: string, data: { date?: string; channel?: string; orderId?: string; amount?: number; notes?: string }) {
      const updatedAt = now()
      await db.deliveryCosts.update(id, { ...data, _synced: false, _updatedAt: updatedAt })
      await addToSyncQueue({ action: "update", entity: "deliveryCost", data: { id, ...data }, createdAt: now() })
      scheduleSync()
    },

    async delete(id: string) {
      await db.deliveryCosts.delete(id)
      await addToSyncQueue({ action: "delete", entity: "deliveryCost", data: { id }, createdAt: now() })
      scheduleSync()
    },
  },

  contacts: {
    async getAll() {
      const cached = await db.contacts.toArray()
      if (isOnline() && shouldFetch("/api/contacts")) {
        fetch("/api/contacts")
          .then(async (resp) => {
            if (!resp.ok) return
            const data = await resp.json()
            const realIds = new Set(data.map((c: any) => c.id))
            const unsyncedIds = await getUnsyncedIds(db.contacts)
            const queuedIds = await getQueuedIds()

            const localContacts = await db.contacts.toArray()
            for (const local of localContacts) {
              if (realIds.has(local.id)) continue
              if (unsyncedIds.has(local.id)) continue
              if (queuedIds.has(local.id)) continue
              await db.contacts.delete(local.id)
              await db.contactInteractions.where("contactId").equals(local.id).delete()
            }

            await db.contacts.bulkPut(
              data
                .filter((c: any) => !unsyncedIds.has(c.id))
                .map((c: any) => ({ ...c, _synced: true, _updatedAt: now() })),
            )

            const allInteractions = data.flatMap((c: any) => (c.interactions || []).map((i: any) => ({ ...i, contactId: c.id })))
            const unsyncedInteractionIds = await getUnsyncedIds(db.contactInteractions)
            const toUpsert = allInteractions
              .filter((i: any) => !unsyncedInteractionIds.has(i.id))
              .map((i: any) => ({ ...i, _synced: true, _updatedAt: now() }))
            if (toUpsert.length) await db.contactInteractions.bulkPut(toUpsert)
            emitDataRefresh()
          })
          .catch((e) => console.error("Erro ao sync contacts:", e))
      }
      return cached
    },

    async create(data: { name: string; email?: string; phone?: string; type?: string; company?: string; notes?: string }) {
      const id = generateTempId()
      const contact = { ...data, id, type: data.type || "CLIENTE", createdAt: now(), updatedAt: now(), _synced: false, _updatedAt: now() }

      await db.contacts.add(contact)
      await addToSyncQueue({ action: "create", entity: "contact", data: contact, tempId: id, createdAt: now() })

      scheduleSync()
      return contact
    },

    async update(id: string, data: { name?: string; email?: string; phone?: string; type?: string; company?: string; notes?: string }) {
      const updatedAt = now()
      await db.contacts.update(id, { ...data, updatedAt, _synced: false, _updatedAt: updatedAt })
      await addToSyncQueue({ action: "update", entity: "contact", data: { id, ...data }, createdAt: now() })
      scheduleSync()
    },

    async delete(id: string) {
      await db.contacts.delete(id)
      await db.contactInteractions.where("contactId").equals(id).delete()
      await addToSyncQueue({ action: "delete", entity: "contact", data: { id }, createdAt: now() })
      scheduleSync()
    },

    async getInteractions(contactId: string) {
      const items = await db.contactInteractions.where("contactId").equals(contactId).toArray()
      const sorted = items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      if (isOnline() && shouldFetch(`/api/contacts/${contactId}/interactions`)) {
        mergeTable(db.contactInteractions, `/api/contacts/${contactId}/interactions`, {
          scope: (i) => i.contactId === contactId,
        })
          .then(() => emitDataRefresh())
          .catch((e) => console.error("Erro ao sync interactions:", e))
      }
      return sorted
    },

    async createInteraction(contactId: string, data: { type?: string; note: string }) {
      const id = generateTempId()
      const interaction = { ...data, id, contactId, type: data.type || "NOTA", createdAt: now(), _synced: false, _updatedAt: now() }

      await db.contactInteractions.add(interaction)
      await addToSyncQueue({ action: "create", entity: "contactInteraction", data: interaction, tempId: id, createdAt: now() })

      scheduleSync()
      return interaction
    },

    async deleteInteraction(id: string) {
      await db.contactInteractions.delete(id)
      await addToSyncQueue({ action: "delete", entity: "contactInteraction", data: { id }, createdAt: now() })
      scheduleSync()
    },
  },

  async getUnsyncedCount() {
    return db.syncQueue.count()
  },
}
