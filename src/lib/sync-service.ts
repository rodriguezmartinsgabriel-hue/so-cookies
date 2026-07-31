import { db, getLastSyncTime, setLastSyncTime, addSyncError } from "./db-local"

const ENTITY_TABLES: Record<string, string> = {
  order: "orders",
  sale: "sales",
  cashFlow: "cashFlow",
  production: "productions",
  ingredient: "ingredients",
  recipe: "recipes",
  document: "documents",
  deliveryCost: "deliveryCosts",
  channel: "channels",
  priceTier: "priceTiers",
  contact: "contacts",
  contactInteraction: "contactInteractions",
}

let syncLock = false
let pendingSync: ReturnType<typeof setTimeout> | null = null

async function acquireLock(): Promise<boolean> {
  if (syncLock) return false
  syncLock = true
  return true
}

function releaseLock() {
  syncLock = false
}

export async function pushPendingChanges() {
  if (!navigator.onLine) return { pushed: 0 }
  if (!await acquireLock()) return { pushed: 0 }

  try {
    const pending = await db.syncQueue.toArray()
    if (pending.length === 0) return { pushed: 0 }

    const resp = await fetch("/api/sync/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changes: pending }),
    })
    if (resp.ok) {
      const result = await resp.json()
      const processed = Array.isArray(result.processed) ? result.processed : []
      const pendingById = new Map(pending.map((p) => [p.id, p]))
      let pushed = 0
      const toDelete: number[] = []
      for (const p of processed) {
        if (!p.ok) {
          const item = typeof p.queueId === "number" ? await db.syncQueue.get(p.queueId) : undefined
          const attempts = (item?.attempts || 0) + 1
          const dropped = attempts >= 5
          await addSyncError({ entity: item?.entity || "desconhecido", action: item?.action || "?", error: p.error || "Erro desconhecido", dropped })
          if (item && typeof p.queueId === "number") {
            if (dropped) {
              console.error(`Sync: descartando alteração após ${attempts} tentativas (${item.entity}:${item.action})`, p.error)
              await db.syncQueue.delete(p.queueId)
            } else {
              await db.syncQueue.update(p.queueId, { attempts })
            }
          }
          continue
        }
        pushed++
        if (p.tempId && p.realId) await reconcileIds(p.tempId, p.realId)
        if (typeof p.queueId !== "number") continue
        const queued = pendingById.get(p.queueId)
        if (queued?.action === "update") {
          const table = (db as any)[ENTITY_TABLES[queued.entity]]
          const id = queued.data?.id as string | undefined
          if (table?.get && id) {
            const local = await table.get(id)
            if (local && local._updatedAt <= queued.createdAt) {
              await table.update(id, { _synced: true })
            }
          }
        }
        toDelete.push(p.queueId)
      }
      if (toDelete.length) await db.syncQueue.bulkDelete(toDelete)
      return { pushed }
    }
  } catch (e) {
    console.error("Erro no push:", e)
  } finally {
    releaseLock()
  }
  return { pushed: 0 }
}

async function pullUnsyncedIds(table: any) {
  return new Set((await table.toArray()).filter((r: any) => r._synced === false).map((r: any) => r.id))
}

export async function pullChanges() {
  if (!navigator.onLine) return { pulled: 0 }
  if (!await acquireLock()) return { pulled: 0 }

  try {
    const since = await getLastSyncTime()
    const resp = await fetch("/api/sync/pull", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ since }),
    })
    if (resp.ok) {
      const data = await resp.json()
      const tables: { key: string; table: any; map?: (r: any) => any }[] = [
        { key: "orders", table: db.orders },
        { key: "sales", table: db.sales },
        { key: "cashFlow", table: db.cashFlow },
        { key: "productions", table: db.productions },
        { key: "ingredients", table: db.ingredients },
        { key: "recipes", table: db.recipes, map: (r) => ({ ...r, ingredients: JSON.stringify(r.ingredients || []) }) },
        { key: "documents", table: db.documents },
        { key: "deliveryCosts", table: db.deliveryCosts },
        { key: "contacts", table: db.contacts },
        { key: "contactInteractions", table: db.contactInteractions },
      ]

      let pulled = 0
      for (const { key, table, map } of tables) {
        const rows = data[key]
        if (!rows?.length) continue
        const skip = await pullUnsyncedIds(table)
        const toWrite = rows
          .filter((r: any) => !skip.has(r.id))
          .map((r: any) => ({ ...(map ? map(r) : r), _synced: true, _updatedAt: new Date().toISOString() }))
        if (toWrite.length) {
          await table.bulkPut(toWrite)
          pulled += toWrite.length
        }
      }
      await setLastSyncTime(new Date().toISOString())
      return { pulled }
    }
  } catch (e) {
    console.error("Erro no pull:", e)
  } finally {
    releaseLock()
  }
  return { pulled: 0 }
}

export async function syncAll() {
  const pushed = await pushPendingChanges()
  const pulled = await pullChanges()
  return { pushed: pushed.pushed, pulled: pulled.pulled }
}

export function scheduleSync() {
  if (!navigator.onLine) return
  if (pendingSync) clearTimeout(pendingSync)
  pendingSync = setTimeout(async () => {
    pendingSync = null
    await syncAll()
  }, 500)
}

export function registerBackgroundSync() {
  if ("serviceWorker" in navigator && "sync" in window.ServiceWorkerRegistration.prototype) {
    navigator.serviceWorker.ready.then((reg) => {
      ;(reg as any).sync.register("sync-so-manager")
    })
  }

  window.addEventListener("online", () => { scheduleSync() })

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && navigator.onLine) {
      scheduleSync()
    }
  })

  window.addEventListener("focus", () => {
    if (navigator.onLine) scheduleSync()
  })
}

async function reconcileIds(tempId: string, realId: string) {
  if (!tempId.startsWith("offline_")) return

  const order = await db.orders.get(tempId)
  if (order) {
    const existingReal = await db.orders.get(realId)
    if (existingReal) {
      await db.orders.delete(tempId)
      await db.orderItems.where("orderId").equals(tempId).delete()
    } else {
      await db.orders.delete(tempId)
      await db.orderItems.where("orderId").equals(tempId).modify({ orderId: realId, _synced: true })
      await db.orders.put({ ...order, id: realId, _synced: true })
    }
  }

  const sale = await db.sales.get(tempId)
  if (sale) {
    const existingReal = await db.sales.get(realId)
    if (existingReal) {
      await db.sales.delete(tempId)
      await db.saleItems.where("saleId").equals(tempId).delete()
    } else {
      await db.sales.delete(tempId)
      await db.saleItems.where("saleId").equals(tempId).modify({ saleId: realId, _synced: true })
      await db.sales.put({ ...sale, id: realId, _synced: true })
    }
  }

  const cash = await db.cashFlow.get(tempId)
  if (cash) {
    const existingReal = await db.cashFlow.get(realId)
    if (existingReal) {
      await db.cashFlow.delete(tempId)
    } else {
      await db.cashFlow.delete(tempId)
      await db.cashFlow.put({ ...cash, id: realId, _synced: true })
    }
  }

  const prod = await db.productions.get(tempId)
  if (prod) {
    const existingReal = await db.productions.get(realId)
    if (existingReal) {
      await db.productions.delete(tempId)
    } else {
      await db.productions.delete(tempId)
      await db.productions.put({ ...prod, id: realId, _synced: true })
    }
  }

  const ingredient = await db.ingredients.get(tempId)
  if (ingredient) {
    const existingReal = await db.ingredients.get(realId)
    if (existingReal) {
      await db.ingredients.delete(tempId)
    } else {
      await db.ingredients.delete(tempId)
      await db.ingredients.put({ ...ingredient, id: realId, _synced: true })
    }
  }

  const channel = await db.channels.get(tempId)
  if (channel) {
    const existingReal = await db.channels.get(realId)
    if (existingReal) {
      await db.channels.delete(tempId)
    } else {
      await db.channels.delete(tempId)
      await db.channels.put({ ...channel, id: realId, _synced: true })
    }
  }

  const tier = await db.priceTiers.get(tempId)
  if (tier) {
    const existingReal = await db.priceTiers.get(realId)
    if (existingReal) {
      await db.priceTiers.delete(tempId)
    } else {
      await db.priceTiers.delete(tempId)
      await db.priceTiers.put({ ...tier, id: realId, _synced: true })
    }
  }

  const recipe = await db.recipes.get(tempId)
  if (recipe) {
    const existingReal = await db.recipes.get(realId)
    if (existingReal) {
      await db.recipes.delete(tempId)
      await db.recipeItems.where("recipeId").equals(tempId).delete()
    } else {
      await db.recipes.delete(tempId)
      await db.recipeItems.where("recipeId").equals(tempId).modify({ recipeId: realId, _synced: true })
      await db.recipes.put({ ...recipe, id: realId, _synced: true })
    }
  }

  const doc = await db.documents.get(tempId)
  if (doc) {
    const existingReal = await db.documents.get(realId)
    if (existingReal) {
      await db.documents.delete(tempId)
    } else {
      await db.documents.delete(tempId)
      await db.documents.put({ ...doc, id: realId, _synced: true })
    }
  }

  const cost = await db.deliveryCosts.get(tempId)
  if (cost) {
    const existingReal = await db.deliveryCosts.get(realId)
    if (existingReal) {
      await db.deliveryCosts.delete(tempId)
    } else {
      await db.deliveryCosts.delete(tempId)
      await db.deliveryCosts.put({ ...cost, id: realId, _synced: true })
    }
  }

  const contact = await db.contacts.get(tempId)
  if (contact) {
    const existingReal = await db.contacts.get(realId)
    if (existingReal) {
      await db.contacts.delete(tempId)
      await db.contactInteractions.where("contactId").equals(tempId).delete()
    } else {
      await db.contacts.delete(tempId)
      await db.contactInteractions.where("contactId").equals(tempId).modify({ contactId: realId, _synced: true })
      await db.contacts.put({ ...contact, id: realId, _synced: true })
    }
  }

  const interaction = await db.contactInteractions.get(tempId)
  if (interaction) {
    const existingReal = await db.contactInteractions.get(realId)
    if (existingReal) {
      await db.contactInteractions.delete(tempId)
    } else {
      await db.contactInteractions.delete(tempId)
      await db.contactInteractions.put({ ...interaction, id: realId, _synced: true })
    }
  }

  const queued = await db.syncQueue.toArray()
  for (const item of queued) {
    const data = item.data
    if (!data) continue
    let changed = false
    const next: Record<string, unknown> = { ...data }
    if (item.action !== "create" && next.id === tempId) {
      next.id = realId
      changed = true
    }
    if (next.orderId === tempId) {
      next.orderId = realId
      changed = true
    }
    if (next.contactId === tempId) {
      next.contactId = realId
      changed = true
    }
    if (Array.isArray(next.ingredients)) {
      let ingChanged = false
      const ingredients = (next.ingredients as { ingredientId: string }[]).map((ing) => {
        if (ing.ingredientId === tempId) {
          ingChanged = true
          return { ...ing, ingredientId: realId }
        }
        return ing
      })
      if (ingChanged) {
        next.ingredients = ingredients
        changed = true
      }
    }
    if (changed && item.id) {
      await db.syncQueue.update(item.id, { data: next })
    }
  }
}
