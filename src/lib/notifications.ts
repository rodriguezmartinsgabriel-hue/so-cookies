"use client"

import { useState, useEffect, useCallback } from "react"
import { logger } from "./logger"

export type Notification = {
  id: string
  type: "low_stock" | "pending_order" | "ready_order" | "info"
  title: string
  message: string
  read: boolean
  createdAt: string
  href?: string
}

const STORAGE_KEY = "so-notifications-read"

function getReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function markRead(id: string) {
  const readIds = getReadIds()
  readIds.add(id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...readIds]))
}

function clearOldReads(currentIds: string[]) {
  const readIds = getReadIds()
  const currentSet = new Set(currentIds)
  for (const id of readIds) {
    if (!currentSet.has(id)) readIds.delete(id)
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...readIds]))
}

async function buildNotifications(): Promise<Notification[]> {
  const [ingredientsResp, ordersResp] = await Promise.all([fetch("/api/ingredients"), fetch("/api/orders")])

  const ingredients: { id: string; name: string; stockKg?: number; minStockKg?: number }[] = ingredientsResp.ok
    ? await ingredientsResp.json()
    : []
  const orders: { status: string }[] = ordersResp.ok ? await ordersResp.json() : []

  const readIds = getReadIds()
  const notifs: Notification[] = []

  for (const ing of ingredients) {
    if ((ing.stockKg || 0) <= (ing.minStockKg || 0) && (ing.minStockKg ?? 0) > 0) {
      const id = `low-stock-${ing.id}`
      notifs.push({
        id,
        type: "low_stock",
        title: "Estoque baixo",
        message: `${ing.name} com ${ing.stockKg}kg (mínimo: ${ing.minStockKg}kg)`,
        read: readIds.has(id),
        createdAt: new Date().toISOString(),
        href: "/estoque",
      })
    }
  }

  const pendingOrders = orders.filter((o) => o.status === "PENDENTE")
  if (pendingOrders.length > 0) {
    notifs.push({
      id: "pending-orders",
      type: "pending_order",
      title: `${pendingOrders.length} pedido(s) pendente(s)`,
      message: `${pendingOrders.length} aguardando produção`,
      read: readIds.has("pending-orders"),
      createdAt: new Date().toISOString(),
      href: "/pedidos",
    })
  }

  const readyOrders = orders.filter((o) => o.status === "PRONTO")
  if (readyOrders.length > 0) {
    notifs.push({
      id: "ready-orders",
      type: "ready_order",
      title: `${readyOrders.length} pedido(s) pronto(s)`,
      message: "Aguardando entrega",
      read: readIds.has("ready-orders"),
      createdAt: new Date().toISOString(),
      href: "/pedidos",
    })
  }

  return notifs
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const notifs = await buildNotifications()
      clearOldReads(notifs.map((n) => n.id))
      setNotifications(notifs)
    } catch (e) {
      logger.error("Erro ao carregar notificações", undefined, e)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    let ignore = false
    async function loadOnce() {
      try {
        const notifs = await buildNotifications()
        if (ignore) return
        clearOldReads(notifs.map((n) => n.id))
        setNotifications(notifs)
      } catch (e) {
        logger.error("Erro ao carregar notificações", undefined, e)
      }
      if (!ignore) setLoading(false)
    }
    loadOnce()
    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  }, [load])

  function markAsRead(id: string) {
    markRead(id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  function markAllRead() {
    for (const n of notifications) markRead(n.id)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return { notifications, unreadCount, loading, markAsRead, markAllRead, refresh: load }
}
