import { defaultCache } from "@serwist/next/worker"
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist"
import { Serwist, NetworkFirst, ExpirationPlugin, CacheableResponsePlugin } from "serwist"
import { pushPendingChanges, pullChanges } from "../lib/sync-service"

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

const CACHE_VERSION = process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || "dev"

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ request, url }) =>
        request.method === "GET" &&
        url.pathname.startsWith("/icons/"),
      handler: new NetworkFirst({
        cacheName: `icons-${CACHE_VERSION}`,
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 365 * 24 * 60 * 60 }),
        ],
      }),
    },
    {
      matcher: ({ request, url }) =>
        request.method === "GET" &&
        (url.pathname.endsWith(".woff2") ||
          url.pathname.endsWith(".woff") ||
          url.pathname.endsWith(".ttf") ||
          url.pathname.endsWith(".png") ||
          url.pathname.endsWith(".jpg") ||
          url.pathname.endsWith(".svg")),
      handler: new NetworkFirst({
        cacheName: `static-assets-${CACHE_VERSION}`,
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 }),
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
  if (event.data?.type === "CLEAR_CACHES") {
    event.waitUntil(handleClearCaches())
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

async function handleClearCaches() {
  try {
    const cacheNames = await caches.keys()
    await Promise.all(cacheNames.map((name) => caches.delete(name)))
    self.clients.claim()
  } catch (e) {
    console.error("Failed to clear caches:", e)
  }
}
