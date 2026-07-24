import { db, getLastSyncTime, setLastSyncTime, clearSyncQueue } from "./db-local"

export async function pushPendingChanges() {
  if (!navigator.onLine) return { pushed: 0 }
  const pending = await db.syncQueue.toArray()
  if (pending.length === 0) return { pushed: 0 }

  try {
    const resp = await fetch("/api/sync/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changes: pending }),
    })
    if (resp.ok) {
      const result = await resp.json()
      await clearSyncQueue()
      if (result.mappings) {
        for (const [tempId, realId] of Object.entries(result.mappings)) {
          await reconcileIds(tempId as string, realId as string)
        }
      }
      return { pushed: pending.length }
    }
  } catch {}
  return { pushed: 0 }
}

export async function pullChanges() {
  if (!navigator.onLine) return { pulled: 0 }
  const since = await getLastSyncTime()

  try {
    const resp = await fetch("/api/sync/pull", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ since }),
    })
    if (resp.ok) {
      const data = await resp.json()
      if (data.orders) await db.orders.bulkPut(data.orders)
      if (data.sales) await db.sales.bulkPut(data.sales)
      if (data.cashFlow) await db.cashFlow.bulkPut(data.cashFlow)
      if (data.productions) await db.productions.bulkPut(data.productions)
      await setLastSyncTime(new Date().toISOString())
      return { pulled: (data.orders?.length || 0) + (data.sales?.length || 0) + (data.cashFlow?.length || 0) + (data.productions?.length || 0) }
    }
  } catch {}
  return { pulled: 0 }
}

export async function syncAll() {
  const pushed = await pushPendingChanges()
  const pulled = await pullChanges()
  return { pushed: pushed.pushed, pulled: pulled.pulled }
}

export function registerBackgroundSync() {
  if ("serviceWorker" in navigator && "sync" in window.ServiceWorkerRegistration.prototype) {
    navigator.serviceWorker.ready.then((reg) => {
      ;(reg as any).sync.register("sync-so-manager")
    })
  }

  if (navigator.onLine) {
    window.addEventListener("online", () => { syncAll() })
  }
}

async function reconcileIds(tempId: string, realId: string) {
  const order = await db.orders.get(tempId)
  if (order) {
    await db.orders.delete(tempId)
    await db.orderItems.where("orderId").equals(tempId).modify({ orderId: realId, _synced: true })
    await db.orders.put({ ...order, id: realId, _synced: true })
  }
  const sale = await db.sales.get(tempId)
  if (sale) {
    await db.sales.delete(tempId)
    await db.saleItems.where("saleId").equals(tempId).modify({ saleId: realId, _synced: true })
    await db.sales.put({ ...sale, id: realId, _synced: true })
  }
}