"use client"

import { useState, useEffect, useCallback } from "react"
import { db } from "@/lib/db-local"

export function useOrders() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      if (navigator.onLine) {
        const resp = await fetch("/api/orders")
        if (resp.ok) {
          const data = await resp.json()
          await db.orders.bulkPut(data.map((o: any) => ({ ...o, _synced: true, _updatedAt: new Date().toISOString() })))
          setOrders(data)
          setLoading(false)
          return
        }
      }
    } catch {}

    const local = await db.orders.toArray()
    setOrders(local)
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { orders, loading, refresh }
}