"use client"

import { useState, useEffect, useCallback } from "react"
import { db } from "@/lib/db-local"

export function useSales() {
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      if (navigator.onLine) {
        const resp = await fetch("/api/sales")
        if (resp.ok) {
          const data = await resp.json()
          await db.sales.bulkPut(data.map((s: any) => ({ ...s, _synced: true, _updatedAt: new Date().toISOString() })))
          setSales(data)
          setLoading(false)
          return
        }
      }
    } catch (e) {
      console.error("Erro ao buscar vendas:", e)
    }

    const local = await db.sales.toArray()
    setSales(local)
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { sales, loading, refresh }
}