"use client"

import { useEffect, useCallback, useState, useSyncExternalStore } from "react"
import { syncAll, registerBackgroundSync } from "@/lib/sync-service"
import { getPendingSyncCount, getSyncErrors, clearSyncErrors, getLastSyncTime, NEVER_SYNCED, type SyncErrorItem } from "@/lib/db-local"

function normalizeLastSync(iso: string): string | null {
  return iso && iso !== NEVER_SYNCED ? iso : null
}

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb)
  window.addEventListener("offline", cb)
  return () => {
    window.removeEventListener("online", cb)
    window.removeEventListener("offline", cb)
  }
}

function getOnlineSnapshot() {
  return navigator.onLine
}

function getOnlineServerSnapshot() {
  return true
}

export function useSync() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [errors, setErrors] = useState<SyncErrorItem[]>([])
  const [lastSync, setLastSync] = useState<string | null>(null)

  const refreshState = useCallback(async () => {
    setPendingCount(await getPendingSyncCount())
    setErrors(await getSyncErrors())
    setLastSync(normalizeLastSync(await getLastSyncTime()))
  }, [])

  const doSync = useCallback(async () => {
    if (!navigator.onLine) return
    setIsSyncing(true)
    try {
      await syncAll()
    } finally {
      setIsSyncing(false)
      await refreshState()
    }
  }, [refreshState])

  const clearErrors = useCallback(async () => {
    await clearSyncErrors()
    setErrors([])
  }, [])

  const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getOnlineServerSnapshot)

  useEffect(() => {
    registerBackgroundSync()
    let ignore = false

    async function refresh() {
      const count = await getPendingSyncCount()
      const errs = await getSyncErrors()
      const t = await getLastSyncTime()
      if (ignore) return
      setPendingCount(count)
      setErrors(errs)
      setLastSync(normalizeLastSync(t))
    }
    refresh()

    const handleOnline = () => { doSync() }

    window.addEventListener("online", handleOnline)
    return () => {
      ignore = true
      window.removeEventListener("online", handleOnline)
    }
  }, [doSync])

  return { isSyncing, pendingCount, isOnline, errors, lastSync, doSync, clearErrors, refresh: refreshState }
}
