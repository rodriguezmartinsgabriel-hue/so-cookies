"use client"

import { useEffect, useCallback, useState } from "react"
import { syncAll, registerBackgroundSync } from "@/lib/sync-service"
import { getPendingSyncCount, getSyncErrors, clearSyncErrors, type SyncErrorItem } from "@/lib/db-local"

export function useSync() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [isOnline, setIsOnline] = useState(true)
  const [errors, setErrors] = useState<SyncErrorItem[]>([])

  const refreshState = useCallback(async () => {
    setPendingCount(await getPendingSyncCount())
    setErrors(await getSyncErrors())
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

  useEffect(() => {
    setIsOnline(navigator.onLine)
    registerBackgroundSync()
    refreshState()

    const handleOnline = () => { setIsOnline(true); doSync() }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [doSync, refreshState])

  return { isSyncing, pendingCount, isOnline, errors, doSync, clearErrors }
}
