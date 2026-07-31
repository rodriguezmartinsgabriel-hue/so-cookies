import { defaultCache } from "@serwist/next/worker"
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist"
import { Serwist } from "serwist"
import { pushPendingChanges, pullChanges } from "../lib/sync-service"

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document"
        },
      },
    ],
  },
})

serwist.addEventListeners()

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-so-manager") {
    event.waitUntil(handleBackgroundSync())
  }
})

self.addEventListener("message", (event) => {
  if (event.data?.type === "TRIGGER_SYNC") {
    event.waitUntil(handleBackgroundSync())
  }
})

async function handleBackgroundSync() {
  try {
    await pushPendingChanges()
    await pullChanges()
  } catch (e) {
    console.error("Background sync failed:", e)
  }
}
