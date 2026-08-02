"use client"

import { useCallback, useState } from "react"

export type CartItem = { productId: string; qty: number }

const STORAGE_KEY = "socookie_cart"

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(loadCart)

  const persist = useCallback((next: CartItem[]) => {
    setItems(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {}
  }, [])

  const addItem = useCallback(
    (productId: string, qty = 1) => {
      const next = [...items]
      const found = next.find((i) => i.productId === productId)
      if (found) {
        found.qty += qty
      } else {
        next.push({ productId, qty })
      }
      persist(next)
    },
    [items, persist],
  )

  const setQty = useCallback(
    (productId: string, qty: number) => {
      if (qty <= 0) {
        persist(items.filter((i) => i.productId !== productId))
        return
      }
      persist(items.map((i) => (i.productId === productId ? { ...i, qty } : i)))
    },
    [items, persist],
  )

  const removeItem = useCallback(
    (productId: string) => {
      persist(items.filter((i) => i.productId !== productId))
    },
    [items, persist],
  )

  const clear = useCallback(() => persist([]), [persist])

  const count = items.reduce((sum, i) => sum + i.qty, 0)

  return { items, addItem, setQty, removeItem, clear, count }
}
