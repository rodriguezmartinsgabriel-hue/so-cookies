import { logger } from "./logger"

export async function clearSWCaches(): Promise<void> {
  if (typeof caches === "undefined") return
  const cacheNames = await caches.keys()
  await Promise.all(cacheNames.map((name) => caches.delete(name)))
}

export async function clearDexieDB(): Promise<void> {
  if (typeof indexedDB === "undefined") return
  const dbName = "SoManagerDB"
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(dbName)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    request.onblocked = () => {
      logger.warn("[sw] IndexedDB delete blocked - will retry on next unload")
      resolve()
    }
  })
}

export async function clearAllOfflineData(): Promise<void> {
  await clearSWCaches()
  await clearDexieDB()
  try {
    localStorage.removeItem("socookie_cart")
  } catch {
    // localStorage may not be available
  }
}
