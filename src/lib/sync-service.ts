import type { EntityTable } from "dexie"
import { db, getLastSyncTime, setLastSyncTime, addSyncError, clearSyncErrorsFor, type LocalOrder, type LocalSale, type LocalCashFlow, type LocalProduction, type LocalProduct, type LocalIngredient, type LocalRecipe, type LocalDocument, type LocalDeliveryCost, type LocalContact, type LocalContactInteraction, type LocalPriceTier, type LocalChannel, type SyncQueueItem } from "./db-local"
import { emitDataRefresh } from "./refresh-events"
import { MAX_PUSH_BODY } from "./files"

const ENTITY_TABLES: Record<string, string> = {
  order: "orders",
  sale: "sales",
  cashFlow: "cashFlow",
  production: "productions",
  product: "products",
  ingredient: "ingredients",
  recipe: "recipes",
  document: "documents",
  deliveryCost: "deliveryCosts",
  channel: "channels",
  priceTier: "priceTiers",
  contact: "contacts",
  contactInteraction: "contactInteractions",
}

const SYNC_INTERVAL_MS = 25_000

const MAX_PUSH_ATTEMPTS = 10

const RECONCILE_INTERVAL_MS = 5 * 60 * 1000

let syncLock = false
let pendingSync: ReturnType<typeof setTimeout> | null = null
let backgroundSyncRegistered = false

async function acquireLock(): Promise<boolean> {
  if (syncLock) return false
  syncLock = true
  return true
}

function releaseLock() {
  syncLock = false
}

function itemKeyFor(item: { entity: string; data?: Record<string, unknown>; tempId?: string }): string | undefined {
  const id = typeof item.data?.id === "string" ? item.data.id : item.tempId
  return id ? `${item.entity}:${id}` : undefined
}

function backoffMs(attempts: number) {
  return Math.min(Math.pow(attempts, 2) * 1000, 60_000)
}

function estimateItemSize(item: SyncQueueItem) {
  return JSON.stringify(item.data ?? {}).length + 256
}

function buildBatches(items: SyncQueueItem[]): SyncQueueItem[][] {
  const batches: SyncQueueItem[][] = []
  let current: SyncQueueItem[] = []
  let size = 0
  for (const item of items) {
    const itemSize = estimateItemSize(item)
    if (itemSize > MAX_PUSH_BODY) {
      if (current.length) {
        batches.push(current)
        current = []
        size = 0
      }
      batches.push([item])
      continue
    }
    if (current.length && size + itemSize > MAX_PUSH_BODY) {
      batches.push(current)
      current = []
      size = 0
    }
    current.push(item)
    size += itemSize
  }
  if (current.length) batches.push(current)
  return batches
}

function pushErrorForStatus(status: number): string {
  if (status === 413) {
    return "Arquivo grande demais para sincronizar (limite da plataforma). Reduza o anexo ou use um arquivo menor."
  }
  if (status === 401 || status === 403) {
    return "Sessão expirada — faça login novamente."
  }
  return `Falha ao sincronizar com o servidor (status ${status}).`
}

async function recordBatchFailure(batch: SyncQueueItem[], status: number) {
  const error = pushErrorForStatus(status)
  for (const item of batch) {
    const attempts = (item.attempts || 0) + 1
    if (item.id !== undefined) {
      await db.syncQueue.update(item.id, { attempts, lastAttemptAt: new Date().toISOString() })
    }
    await addSyncError({ entity: item.entity, action: item.action, error, itemKey: itemKeyFor(item) })
  }
}

export async function pushPendingChanges() {
  if (!navigator.onLine) return { pushed: 0 }
  if (!await acquireLock()) return { pushed: 0 }

  try {
    const pending = await db.syncQueue.toArray()
    if (pending.length === 0) return { pushed: 0 }

    const nowMs = Date.now()
    const eligible = pending.filter((item) => {
      if (!item.lastAttemptAt) return true
      return nowMs - new Date(item.lastAttemptAt).getTime() >= backoffMs(item.attempts || 1)
    })
    if (eligible.length === 0) return { pushed: 0 }

    const batches = buildBatches(eligible)
    let pushed = 0
    for (const batch of batches) {
      const resp = await fetch("/api/sync/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes: batch }),
      })
      if (!resp.ok) {
        await recordBatchFailure(batch, resp.status)
        continue
      }
      const result = await resp.json()
      const processed = Array.isArray(result.processed) ? result.processed : []
      const batchById = new Map(batch.map((p) => [p.id, p]))
      const toDelete: number[] = []
      for (const p of processed) {
        const item = typeof p.queueId === "number" ? batchById.get(p.queueId) : undefined
        const itemKey = item ? itemKeyFor(item) : undefined
        if (!p.ok) {
          if (item && typeof p.queueId === "number") {
            const attempts = (item.attempts || 0) + 1
            if (attempts >= MAX_PUSH_ATTEMPTS) {
              await db.syncQueue.delete(p.queueId)
              await addSyncError({ entity: item.entity, action: item.action, error: p.error || "Erro desconhecido", dropped: true, itemKey })
              continue
            }
            await db.syncQueue.update(p.queueId, { attempts, lastAttemptAt: new Date().toISOString() })
          }
          await addSyncError({ entity: item?.entity || "desconhecido", action: item?.action || "?", error: p.error || "Erro desconhecido", dropped: false, itemKey })
          continue
        }
        pushed++
        if (itemKey) await clearSyncErrorsFor(itemKey)
        if (p.tempId && p.realId) await reconcileIds(p.tempId, p.realId)
        if (typeof p.queueId !== "number") continue
        const queued = item
        if (queued?.action === "update") {
          const table = getLocalTable(queued.entity)
          const id = queued.data?.id as string | undefined
          if (table && id) {
            const local = await table.get(id)
            if (local && local._updatedAt && local._updatedAt <= queued.createdAt) {
              await table.update(id, { _synced: true })
            }
          }
        }
        toDelete.push(p.queueId)
      }
      if (toDelete.length) await db.syncQueue.bulkDelete(toDelete)
    }
    return { pushed }
  } catch (e) {
    console.error("Erro no push:", e)
  } finally {
    releaseLock()
  }
  return { pushed: 0 }
}

interface LocalSyncRow {
  id: string
  _synced?: boolean
  _updatedAt?: string
  ingredients?: unknown
}

interface LocalSyncTable {
  get(id: string): Promise<LocalSyncRow | undefined>
  toArray(): Promise<LocalSyncRow[]>
  delete(id: string): Promise<void>
  update(id: string, changes: Partial<LocalSyncRow>): Promise<number>
}

async function pullUnsyncedIds<T extends { id: string; _synced?: boolean }>(table: { toArray(): Promise<T[]> }) {
  return new Set((await table.toArray()).filter((r) => r._synced === false).map((r) => r.id))
}

async function writeRows<TLocal extends LocalSyncRow>(
  table: EntityTable<TLocal, "id">,
  rows: TLocal[] | undefined,
) {
  if (!rows?.length) return 0
  const skip = await pullUnsyncedIds(table)
  const toWrite = rows
    .filter((r) => !skip.has(r.id))
    .map((r) => ({ ...r, _synced: true, _updatedAt: (r as { updatedAt?: string }).updatedAt || new Date().toISOString() } as TLocal))
  if (!toWrite.length) return 0
  await table.bulkPut(toWrite)
  return toWrite.length
}

function getLocalTable(entity: string): LocalSyncTable | undefined {
  const tableName = ENTITY_TABLES[entity]
  if (!tableName) return undefined
  return (db as unknown as Record<string, LocalSyncTable | undefined>)[tableName]
}

async function applyLocalDelete(entity: string, recordId: string) {
  const table = getLocalTable(entity)
  if (!table) return
  switch (entity) {
    case "order":
      await db.orderItems.where("orderId").equals(recordId).delete()
      break
    case "sale":
      await db.saleItems.where("saleId").equals(recordId).delete()
      break
    case "recipe":
      await db.recipeItems.where("recipeId").equals(recordId).delete()
      break
    case "contact":
      await db.contactInteractions.where("contactId").equals(recordId).delete()
      break
    case "product":
      await db.priceTiers.where("productId").equals(recordId).delete()
      break
    case "ingredient": {
      await db.recipeItems.where("ingredientId").equals(recordId).delete()
      const affected = await db.recipes.toArray()
      for (const r of affected) {
        try {
          const items = JSON.parse(r.ingredients)
          if (Array.isArray(items) && items.some((i: { ingredientId: string }) => i.ingredientId === recordId)) {
            await db.recipes.update(r.id, { ingredients: JSON.stringify(items.filter((i: { ingredientId: string }) => i.ingredientId !== recordId)) })
          }
        } catch {
          /* JSON inválido local: ignora */
        }
      }
      break
    }
  }
  await table.delete(recordId)
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
      let pulled = 0

      pulled += await writeRows(db.orders, data.orders as LocalOrder[] | undefined)
      pulled += await writeRows(db.sales, data.sales as LocalSale[] | undefined)
      pulled += await writeRows(db.cashFlow, data.cashFlow as LocalCashFlow[] | undefined)
      pulled += await writeRows(db.productions, data.productions as LocalProduction[] | undefined)
      pulled += await writeRows(db.products, data.products as LocalProduct[] | undefined)
      pulled += await writeRows(db.ingredients, data.ingredients as LocalIngredient[] | undefined)
      pulled += await writeRows(db.priceTiers, data.priceTiers as LocalPriceTier[] | undefined)
      pulled += await writeRows(db.documents, data.documents as LocalDocument[] | undefined)
      pulled += await writeRows(db.deliveryCosts, data.deliveryCosts as LocalDeliveryCost[] | undefined)
      pulled += await writeRows(db.contacts, data.contacts as LocalContact[] | undefined)
      pulled += await writeRows(db.contactInteractions, data.contactInteractions as LocalContactInteraction[] | undefined)
      pulled += await writeRows(db.channels, data.channels as LocalChannel[] | undefined)

      const recipeRows = data.recipes as Array<Omit<LocalRecipe, "ingredients"> & { ingredients?: unknown }> | undefined
      if (recipeRows?.length) {
        const skip = await pullUnsyncedIds(db.recipes)
        const toWrite = recipeRows
          .filter((r) => !skip.has(r.id))
          .map((r) => ({ ...r, ingredients: JSON.stringify(r.ingredients || []), _synced: true, _updatedAt: (r as { updatedAt?: string }).updatedAt || new Date().toISOString() }))
        if (toWrite.length) {
          await db.recipes.bulkPut(toWrite)
          pulled += toWrite.length
        }
      }

      const deletions = Array.isArray(data.deletions) ? data.deletions : []
      if (deletions.length) {
        const protectedIdsByEntity = new Map<string, Set<string>>()
        const queuedIds = new Set((await db.syncQueue.toArray()).map((q) => q.data?.id as string).filter(Boolean))
        for (const del of deletions) {
          if (protectedIdsByEntity.has(del.entity)) continue
          const table = getLocalTable(del.entity)
          if (!table) continue
          const rows = await table.toArray()
          const unsynced = rows
            .filter((r) => r && typeof r === "object" && (r as { _synced?: boolean })._synced === false)
            .map((r) => (r as { id?: string }).id)
            .filter((id): id is string => Boolean(id))
          protectedIdsByEntity.set(del.entity, new Set(unsynced))
        }
        for (const del of deletions) {
          const table = getLocalTable(del.entity)
          if (!table) continue
          if ((protectedIdsByEntity.get(del.entity) || new Set<string>()).has(del.recordId) || queuedIds.has(del.recordId)) continue
          const local = await table.get(del.recordId)
          if (local) {
            await applyLocalDelete(del.entity, del.recordId)
            pulled++
          }
        }
      }

      const serverTime = typeof data.serverTime === "string" ? data.serverTime : new Date().toISOString()
      await setLastSyncTime(serverTime)
      if (pulled > 0) emitDataRefresh()
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
  if (backgroundSyncRegistered) return
  backgroundSyncRegistered = true

  if ("serviceWorker" in navigator && "sync" in window.ServiceWorkerRegistration.prototype) {
    navigator.serviceWorker.ready.then((reg) => {
      ;(reg as ServiceWorkerRegistration & { sync?: { register(tag: string): Promise<void> } }).sync?.register("sync-so-manager")
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

  setInterval(async () => {
    if (document.visibilityState === "visible" && navigator.onLine) {
      await syncAll()
    }
  }, SYNC_INTERVAL_MS)

  setInterval(() => {
    if (document.visibilityState === "visible" && navigator.onLine) {
      fetch("/api/integrations/reconcile", { method: "POST" }).catch(() => {})
    }
  }, RECONCILE_INTERVAL_MS)
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

  const product = await db.products.get(tempId)
  if (product) {
    const existingReal = await db.products.get(realId)
    if (existingReal) {
      await db.products.delete(tempId)
    } else {
      await db.products.delete(tempId)
      await db.products.put({ ...product, id: realId, _synced: true })
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
    if (next.productId === tempId) {
      next.productId = realId
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
