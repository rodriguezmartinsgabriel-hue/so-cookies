import { defaultCache } from "@serwist/next/worker"
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist"
import { Serwist, StaleWhileRevalidate, ExpirationPlugin, CacheableResponsePlugin } from "serwist"
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
  runtimeCaching: [
    {
      matcher: ({ request, sameOrigin, url }) =>
        sameOrigin &&
        request.method === "GET" &&
        url.pathname.startsWith("/api/") &&
        !url.pathname.startsWith("/api/public/auth/") &&
        !url.pathname.startsWith("/api/auth"),
      handler: new StaleWhileRevalidate({
        cacheName: "api-get",
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 }),
        ],
      }),
    },
    {
      matcher: ({ request }) => request.destination === "document",
      handler: new StaleWhileRevalidate({
        cacheName: "pages",
        plugins: [
          new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 7 * 24 * 60 * 60 }),
        ],
      }),
    },
    ...defaultCache,
  ],
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
