import { db, addToSyncQueue, getLastSyncTime } from "./db-local"
import { scheduleSync } from "./sync-service"

const isOnline = () => navigator.onLine

function generateTempId() {
  return `offline_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function now() {
  return new Date().toISOString()
}

export const repository = {
  orders: {
    async getAll() {
      if (isOnline()) {
        try {
          const resp = await fetch("/api/orders")
          if (resp.ok) {
            const data = await resp.json()
            const realIds = new Set(data.map((o: any) => o.id))
            const localOnly = await db.orders.toArray()
            for (const local of localOnly) {
              if (local.id.startsWith("offline_") && !realIds.has(local.id)) {
                await db.orders.delete(local.id)
                await db.orderItems.where("orderId").equals(local.id).delete()
              }
            }
            const unsyncedLocal = await db.orders.where("_synced").equals(0).toArray()
            const unsyncedIds = new Set(unsyncedLocal.map((o) => o.id))
            const toUpsert = data
              .filter((o: any) => !unsyncedIds.has(o.id))
              .map((o: any) => ({ ...o, _synced: true, _updatedAt: now() }))
            await db.orders.bulkPut(toUpsert)
          }
        } catch {}
      }
      return db.orders.toArray()
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
      if (isOnline()) {
        try {
          const resp = await fetch("/api/sales")
          if (resp.ok) {
            const data = await resp.json()
            const realIds = new Set(data.map((s: any) => s.id))
            const localOnly = await db.sales.toArray()
            for (const local of localOnly) {
              if (local.id.startsWith("offline_") && !realIds.has(local.id)) {
                await db.sales.delete(local.id)
                await db.saleItems.where("saleId").equals(local.id).delete()
              }
            }
            const unsyncedIds = new Set((await db.sales.where("_synced").equals(0).toArray()).map((s) => s.id))
            await db.sales.bulkPut(data.filter((s: any) => !unsyncedIds.has(s.id)).map((s: any) => ({ ...s, _synced: true, _updatedAt: now() })))
          }
        } catch {}
      }
      return db.sales.toArray()
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
      if (isOnline()) {
        try {
          const resp = await fetch("/api/cashflow")
          if (resp.ok) {
            const data = await resp.json()
            const realIds = new Set(data.map((e: any) => e.id))
            const localOnly = await db.cashFlow.toArray()
            for (const local of localOnly) {
              if (local.id.startsWith("offline_") && !realIds.has(local.id)) {
                await db.cashFlow.delete(local.id)
              }
            }
            const unsyncedIds = new Set((await db.cashFlow.where("_synced").equals(0).toArray()).map((e) => e.id))
            await db.cashFlow.bulkPut(data.filter((e: any) => !unsyncedIds.has(e.id)).map((e: any) => ({ ...e, _synced: true, _updatedAt: now() })))
          }
        } catch {}
      }
      return db.cashFlow.toArray()
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
      if (isOnline()) {
        try {
          const resp = await fetch("/api/productions")
          if (resp.ok) {
            const data = await resp.json()
            const realIds = new Set(data.map((p: any) => p.id))
            const localOnly = await db.productions.toArray()
            for (const local of localOnly) {
              if (local.id.startsWith("offline_") && !realIds.has(local.id)) {
                await db.productions.delete(local.id)
              }
            }
            const unsyncedIds = new Set((await db.productions.where("_synced").equals(0).toArray()).map((p) => p.id))
            await db.productions.bulkPut(data.filter((p: any) => !unsyncedIds.has(p.id)).map((p: any) => ({ ...p, _synced: true, _updatedAt: now() })))
          }
        } catch {}
      }
      return db.productions.toArray()
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
      if (isOnline()) {
        try {
          const resp = await fetch("/api/products")
          if (resp.ok) {
            const data = await resp.json()
            await db.products.bulkPut(data.map((p: any) => ({ ...p, _synced: true })))
          }
        } catch {}
      }
      return db.products.toArray()
    },
  },

  ingredients: {
    async getAll() {
      if (isOnline()) {
        try {
          const resp = await fetch("/api/ingredients")
          if (resp.ok) {
            const data = await resp.json()
            const realIds = new Set(data.map((i: any) => i.id))
            const localOnly = await db.ingredients.toArray()
            for (const local of localOnly) {
              if (local.id.startsWith("offline_") && !realIds.has(local.id)) {
                await db.ingredients.delete(local.id)
              }
            }
            const unsyncedIds = new Set((await db.ingredients.where("_synced").equals(0).toArray()).map((i) => i.id))
            await db.ingredients.bulkPut(data.filter((i: any) => !unsyncedIds.has(i.id)).map((i: any) => ({ ...i, _synced: true, _updatedAt: now() })))
          }
        } catch {}
      }
      return db.ingredients.toArray()
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
      if (isOnline()) {
        try {
          const resp = await fetch("/api/channels")
          if (resp.ok) {
            const data = await resp.json()
            const realIds = new Set(data.map((c: any) => c.id))
            const localOnly = await db.channels.toArray()
            for (const local of localOnly) {
              if (local.id.startsWith("offline_") && !realIds.has(local.id)) {
                await db.channels.delete(local.id)
              }
            }
            const unsyncedIds = new Set((await db.channels.where("_synced").equals(0).toArray()).map((c) => c.id))
            await db.channels.bulkPut(data.filter((c: any) => !unsyncedIds.has(c.id)).map((c: any) => ({ ...c, _synced: true, _updatedAt: now() })))
          }
        } catch {}
      }
      return db.channels.toArray()
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
      if (isOnline()) {
        try {
          const resp = await fetch("/api/price-tiers")
          if (resp.ok) {
            const data = await resp.json()
            const realIds = new Set(data.map((t: any) => t.id))
            const localOnly = await db.priceTiers.toArray()
            for (const local of localOnly) {
              if (local.id.startsWith("offline_") && !realIds.has(local.id)) {
                await db.priceTiers.delete(local.id)
              }
            }
            const unsyncedIds = new Set((await db.priceTiers.where("_synced").equals(0).toArray()).map((t) => t.id))
            await db.priceTiers.bulkPut(data.filter((t: any) => !unsyncedIds.has(t.id)).map((t: any) => ({ ...t, _synced: true, _updatedAt: now() })))
          }
        } catch {}
      }
      return db.priceTiers.toArray()
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
      if (isOnline()) {
        try {
          const resp = await fetch("/api/recipes")
          if (resp.ok) {
            const data = await resp.json()
            const realIds = new Set(data.map((r: any) => r.id))
            const localOnly = await db.recipes.toArray()
            for (const local of localOnly) {
              if (local.id.startsWith("offline_") && !realIds.has(local.id)) {
                await db.recipes.delete(local.id)
                await db.recipeItems.where("recipeId").equals(local.id).delete()
              }
            }
            const unsyncedIds = new Set((await db.recipes.where("_synced").equals(0).toArray()).map((r) => r.id))
            const toUpsert = data
              .filter((r: any) => !unsyncedIds.has(r.id))
              .map((r: any) => ({ ...r, ingredients: JSON.stringify(r.ingredients || []), _synced: true, _updatedAt: now() }))
            await db.recipes.bulkPut(toUpsert)
          }
        } catch {}
      }
      return (await db.recipes.toArray()).map((r) => ({ ...r, ingredients: JSON.parse(r.ingredients) }))
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
      if (isOnline()) {
        try {
          const resp = await fetch("/api/documents")
          if (resp.ok) {
            const data = await resp.json()
            const realIds = new Set(data.map((d: any) => d.id))
            const localOnly = await db.documents.toArray()
            for (const local of localOnly) {
              if (local.id.startsWith("offline_") && !realIds.has(local.id)) {
                await db.documents.delete(local.id)
              }
            }
            const unsyncedIds = new Set((await db.documents.where("_synced").equals(0).toArray()).map((d) => d.id))
            await db.documents.bulkPut(data.filter((d: any) => !unsyncedIds.has(d.id)).map((d: any) => ({ ...d, _synced: true, _updatedAt: now() })))
          }
        } catch {}
      }
      return db.documents.toArray()
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
      if (isOnline()) {
        try {
          const resp = await fetch("/api/delivery-cost")
          if (resp.ok) {
            const data = await resp.json()
            const realIds = new Set(data.map((c: any) => c.id))
            const localOnly = await db.deliveryCosts.toArray()
            for (const local of localOnly) {
              if (local.id.startsWith("offline_") && !realIds.has(local.id)) {
                await db.deliveryCosts.delete(local.id)
              }
            }
            const unsyncedIds = new Set((await db.deliveryCosts.where("_synced").equals(0).toArray()).map((c) => c.id))
            await db.deliveryCosts.bulkPut(data.filter((c: any) => !unsyncedIds.has(c.id)).map((c: any) => ({ ...c, _synced: true, _updatedAt: now() })))
          }
        } catch {}
      }
      return db.deliveryCosts.toArray()
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

  async getUnsyncedCount() {
    return db.syncQueue.count()
  },
}
