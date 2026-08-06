"use client"

import { useSyncExternalStore, useCallback } from "react"

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

type CartState = { items: CartItem[]; count: number }
type Listener = () => void

const EMPTY_CART: CartState = { items: [], count: 0 }

function computeCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.qty, 0)
}

let lastStored: string | null = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null

let cartState: CartState = (() => {
  const items = loadCart()
  return { items, count: computeCount(items) }
})()

function getSnapshot(): CartState {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== lastStored) {
      lastStored = stored
      let items: CartItem[] = []
      try {
        items = stored ? (JSON.parse(stored) as CartItem[]) : []
      } catch {}
      cartState = { items, count: computeCount(items) }
    }
  }
  return cartState
}

const listeners = new Set<Listener>()

function persist(items: CartItem[]) {
  try {
    const json = JSON.stringify(items)
    localStorage.setItem(STORAGE_KEY, json)
    lastStored = json
  } catch {}
  if (typeof window !== "undefined") {
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }))
  }
}

function setItems(next: CartItem[]) {
  cartState = { items: next, count: computeCount(next) }
  persist(next)
  emit()
}

function emit() {
  for (const l of listeners) l()
}

const cartStore = {
  addItem(productId: string, qty = 1) {
    const items = [...cartState.items]
    const found = items.find((i) => i.productId === productId)
    if (found) {
      found.qty += qty
    } else {
      items.push({ productId, qty })
    }
    setItems(items)
  },

  setQty(productId: string, qty: number) {
    if (qty <= 0) {
      setItems(cartState.items.filter((i) => i.productId !== productId))
    } else {
      setItems(cartState.items.map((i) => (i.productId === productId ? { ...i, qty } : i)))
    }
  },

  removeItem(productId: string) {
    setItems(cartState.items.filter((i) => i.productId !== productId))
  },

  clear() {
    setItems([])
  },

  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },

  getSnapshot,
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      if (e.newValue === lastStored) return
      lastStored = e.newValue
      const items = e.newValue ? (JSON.parse(e.newValue) as CartItem[]) : []
      cartState = { items, count: computeCount(items) }
      emit()
    }
  })
}

export function useCart() {
  const { items, count } = useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot, () => EMPTY_CART)

  const addItem = useCallback((productId: string, qty = 1) => cartStore.addItem(productId, qty), [])
  const setQty = useCallback((productId: string, qty: number) => cartStore.setQty(productId, qty), [])
  const removeItem = useCallback((productId: string) => cartStore.removeItem(productId), [])
  const clear = useCallback(() => cartStore.clear(), [])

  return { items, addItem, setQty, removeItem, clear, count }
}
