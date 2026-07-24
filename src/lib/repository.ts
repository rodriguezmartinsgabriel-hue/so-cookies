import { db, addToSyncQueue, getLastSyncTime, setLastSyncTime } from "./db-local"

const isOnline = () => navigator.onLine

function generateTempId() {
  return `offline_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function now() {
  return new Date().toISOString()
}

async function tryRemote<T>(fn: () => Promise<T>, fallback: T | Promise<T>): Promise<T> {
  if (!isOnline()) return await fallback
  try {
    return await fn()
  } catch {
    return await fallback
  }
}

export const repository = {
  orders: {
    async getAll() {
      return tryRemote(async () => {
        const resp = await fetch("/api/sync/pull", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entity: "orders", since: await getLastSyncTime() }),
        })
        if (resp.ok) {
          const data = await resp.json()
          await db.orders.bulkPut(data.items)
          return db.orders.toArray()
        }
        return db.orders.toArray()
      }, db.orders.toArray())
    },

    async create(data: { channel: string; customer: string; total: number; items: { productId: string; qty: number; price: number }[] }) {
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

      if (isOnline()) {
        try {
          const resp = await fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          })
          if (resp.ok) {
            const saved = await resp.json()
            await db.orders.delete(id)
            await db.orderItems.where("orderId").equals(id).delete()
            await db.orders.add({ ...saved, _synced: true, _updatedAt: now() })
            await db.orderItems.bulkAdd(
              saved.items.map((i: { id: string; orderId: string; productId: string; qty: number; price: number }) => ({ ...i, _synced: true }))
            )
          }
        } catch {}
      }

      return order
    },

    async updateStatus(id: string, status: string) {
      const updatedAt = now()
      await db.orders.update(id, { status, updatedAt, _synced: false })
      await addToSyncQueue({ action: "update", entity: "order", data: { id, status, updatedAt }, createdAt: now() })

      if (isOnline()) {
        try {
          await fetch(`/api/orders/${id}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          })
          await db.orders.update(id, { _synced: true })
        } catch {}
      }
    },
  },

  sales: {
    async getAll() {
      return tryRemote(async () => {
        const resp = await fetch("/api/sync/pull", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entity: "sales", since: await getLastSyncTime() }),
        })
        if (resp.ok) {
          const data = await resp.json()
          await db.sales.bulkPut(data.items)
          return db.sales.toArray()
        }
        return db.sales.toArray()
      }, db.sales.toArray())
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

      if (isOnline()) {
        try {
          const resp = await fetch("/api/sales", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          })
          if (resp.ok) {
            const saved = await resp.json()
            await db.sales.delete(id)
            await db.saleItems.where("saleId").equals(id).delete()
            await db.sales.add({ ...saved, _synced: true, _updatedAt: now() })
            await db.saleItems.bulkAdd(
              saved.items.map((i: { id: string; saleId: string; productId: string; qty: number; price: number }) => ({ ...i, _synced: true }))
            )
          }
        } catch {}
      }

      return sale
    },
  },

  cashFlow: {
    async getAll() {
      return tryRemote(async () => {
        const resp = await fetch("/api/sync/pull", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entity: "cashFlow", since: await getLastSyncTime() }),
        })
        if (resp.ok) {
          const data = await resp.json()
          await db.cashFlow.bulkPut(data.items)
          return db.cashFlow.toArray()
        }
        return db.cashFlow.toArray()
      }, db.cashFlow.toArray())
    },

    async create(data: { type: "ENTRADA" | "SAIDA"; category: string; description: string; amount: number; userId?: string }) {
      const id = generateTempId()
      const entry = { ...data, id, date: now(), _synced: false, _updatedAt: now() }

      await db.cashFlow.add(entry)
      await addToSyncQueue({ action: "create", entity: "cashFlow", data: entry, tempId: id, createdAt: now() })

      if (isOnline()) {
        try {
          const resp = await fetch("/api/cashflow", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          })
          if (resp.ok) {
            const saved = await resp.json()
            await db.cashFlow.delete(id)
            await db.cashFlow.add({ ...saved, _synced: true, _updatedAt: now() })
          }
        } catch {}
      }

      return entry
    },
  },

  productions: {
    async getAll() {
      return tryRemote(async () => {
        const resp = await fetch("/api/sync/pull", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entity: "productions", since: await getLastSyncTime() }),
        })
        if (resp.ok) {
          const data = await resp.json()
          await db.productions.bulkPut(data.items)
          return db.productions.toArray()
        }
        return db.productions.toArray()
      }, db.productions.toArray())
    },

    async create(data: { batchCode: string; productId: string; qty: number; status?: string; notes?: string }) {
      const id = generateTempId()
      const production = { ...data, id, startTime: now(), status: data.status || "pendente", _synced: false, _updatedAt: now() }

      await db.productions.add(production)
      await addToSyncQueue({ action: "create", entity: "production", data: production, tempId: id, createdAt: now() })

      if (isOnline()) {
        try {
          const resp = await fetch("/api/productions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          })
          if (resp.ok) {
            const saved = await resp.json()
            await db.productions.delete(id)
            await db.productions.add({ ...saved, _synced: true, _updatedAt: now() })
          }
        } catch {}
      }

      return production
    },

    async updateStatus(id: string, status: string, endTime?: string) {
      const updates = { status, _synced: false, _updatedAt: now(), ...(endTime ? { endTime } : {}) }
      await db.productions.update(id, updates)
      await addToSyncQueue({ action: "update", entity: "production", data: { id, status, endTime }, createdAt: now() })

      if (isOnline()) {
        try {
          await fetch(`/api/productions/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status, endTime }),
          })
          await db.productions.update(id, { _synced: true })
        } catch {}
      }
    },
  },

  products: {
    async getAll() {
      return tryRemote(async () => {
        const resp = await fetch("/api/products")
        if (resp.ok) {
          const data = await resp.json()
          const products = data.map((p: Record<string, unknown>) => ({ ...p, _synced: true }))
          await db.products.bulkPut(products)
          return db.products.toArray()
        }
        return db.products.toArray()
      }, db.products.toArray())
    },
  },

  async getUnsyncedCount() {
    let count = 0
    count += await db.orders.where("_synced").equals(0).count()
    count += await db.sales.where("_synced").equals(0).count()
    count += await db.cashFlow.where("_synced").equals(0).count()
    count += await db.productions.where("_synced").equals(0).count()
    return count
  },
}