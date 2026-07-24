"use client"

import { useEffect, useCallback, useState } from "react"
import { syncAll, registerBackgroundSync } from "@/lib/sync-service"
import { getPendingSyncCount } from "@/lib/db-local"

export function useSync() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [isOnline, setIsOnline] = useState(true)

  const doSync = useCallback(async () => {
    if (!navigator.onLine) return
    setIsSyncing(true)
    try {
      await syncAll()
    } finally {
      setIsSyncing(false)
      setPendingCount(await getPendingSyncCount())
    }
  }, [])

  useEffect(() => {
    setIsOnline(navigator.onLine)
    registerBackgroundSync()
    getPendingSyncCount().then(setPendingCount)

    const handleOnline = () => { setIsOnline(true); doSync() }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [doSync])

  return { isSyncing, pendingCount, isOnline, doSync }
}