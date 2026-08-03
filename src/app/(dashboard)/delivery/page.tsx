"use client"

import { useState, useEffect, useRef } from "react"
import { useRole } from "@/hooks/useRole"
import { useQueryData } from "@/hooks/useQueryData"
import { AppShell } from "@/components/layout/AppShell"
import { Skeleton } from "@/components/ui/Skeleton"
import { ErrorState } from "@/components/ui/ErrorState"
import { MapPin, Check, Clock, Store, Bell, BellOff, X } from "lucide-react"
import { repository } from "@/lib/repository"
import type { Order } from "@/lib/entity-types"
import { isSoundEnabled, setSoundEnabled, playNotificationSound } from "@/lib/sound"

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDENTE: { label: "Pendente", color: "text-warning bg-warning/10" },
  CONFIRMADO: { label: "Confirmado", color: "text-info bg-info/10" },
  PRODUCAO: { label: "Em Produção", color: "text-info bg-info/10" },
  PRONTO: { label: "Pronto p/ Retirada", color: "text-success bg-success/10" },
  ENTREGA: { label: "Em Rota", color: "text-info bg-info/10" },
  CONCLUIDO: { label: "Entregue", color: "text-muted bg-cream" },
}

const channelFilters = ["Todos", "99Food", "iFood", "Rappi", "WhatsApp", "Só App", "Direto"]

function formatSla(confirmBy: string | null | undefined): string {
  if (!confirmBy) return ""
  const diff = new Date(confirmBy).getTime() - Date.now()
  if (diff <= 0) return "SLA estourado"
  const min = Math.floor(diff / 60000)
  const sec = Math.floor((diff % 60000) / 1000)
  return `${min}:${String(sec).padStart(2, "0")}`
}

function isSlaUrgent(confirmBy: string | null | undefined): boolean {
  if (!confirmBy) return false
  return new Date(confirmBy).getTime() - Date.now() < 120_000
}

export default function DeliveryPage() {
  const { canEdit } = useRole();
  const { data: orders, isLoading: loading, error: ordersError, invalidate } = useQueryData("orders")
  const error = ordersError ? "Erro ao carregar entregas" : null
  const [activeFilter, setActiveFilter] = useState("Todos")
  const [soundOn, setSoundOn] = useState<boolean>(() => isSoundEnabled())
  const [pickupCheck, setPickupCheck] = useState<Order | null>(null)
  const [pickupInput, setPickupInput] = useState("")
  const [pickupError, setPickupError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const seenNew = useRef<Set<string> | null>(null)

  useEffect(() => {
    const interval = setInterval(() => { invalidate() }, 30_000)
    return () => clearInterval(interval)
  }, [invalidate])

  useEffect(() => {
    const pendingNew = orders.filter((o: Order) => (o.platform || o.pickupCode) && o.status === "PENDENTE")
    if (seenNew.current === null) {
      seenNew.current = new Set(pendingNew.map((o: Order) => o.id))
    } else {
      for (const o of pendingNew) {
        if (!seenNew.current.has(o.id)) {
          seenNew.current.add(o.id)
          playNotificationSound()
        }
      }
    }
  }, [orders])

  const deliveryOrders = orders
    .filter((o: Order) => ["PENDENTE", "CONFIRMADO", "PRODUCAO", "PRONTO", "ENTREGA", "CONCLUIDO"].includes(o.status))
    .filter((o: Order) => activeFilter === "Todos" || o.channel === activeFilter)

  async function handleMarkDelivered(id: string) {
    await repository.orders.updateStatus(id, "CONCLUIDO")
    await invalidate()
  }

  function handleDeliverClick(order: Order) {
    if (order.pickupCode) {
      setPickupCheck(order)
      setPickupInput("")
      setPickupError(null)
    } else {
      handleMarkDelivered(order.id)
    }
  }

  async function handlePickupConfirm() {
    if (!pickupCheck || checking) return
    const expected = (pickupCheck.pickupCode || "").trim().toUpperCase()
    const typed = pickupInput.trim().toUpperCase()
    if (typed !== expected) {
      setPickupError("Código não confere. Verifique com o cliente.")
      return
    }
    setChecking(true)
    try {
      await handleMarkDelivered(pickupCheck.id)
      setPickupCheck(null)
      setPickupInput("")
      setPickupError(null)
    } finally {
      setChecking(false)
    }
  }

  async function handleAccept(id: string) {
    await repository.orders.updateStatus(id, "CONFIRMADO")
    await invalidate()
  }

  function toggleSound() {
    const next = !soundOn
    setSoundOn(next)
    setSoundEnabled(next)
    if (next) playNotificationSound()
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">Delivery</h1>
            <p className="text-sm text-muted">
              {deliveryOrders.length} pedidos de delivery
            </p>
          </div>
          <button
            onClick={toggleSound}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-line rounded-lg font-medium text-muted hover:bg-cream transition-colors"
            aria-label={soundOn ? "Desativar som de novos pedidos" : "Ativar som de novos pedidos"}
          >
            {soundOn ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
            {soundOn ? "Som on" : "Som off"}
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {channelFilters.map((ch) => (
            <button
              key={ch}
              onClick={() => setActiveFilter(ch)}
              className={`h-8 px-3 border rounded-full text-xs font-medium transition-colors shrink-0 ${
                activeFilter === ch
                  ? "border-ink bg-ink text-paper"
                  : "border-line text-ink hover:bg-cream"
              }`}
            >
              {ch}
            </button>
          ))}
        </div>

        {error && (
          <ErrorState message={error} onRetry={invalidate} />
        )}

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border border-line rounded-lg bg-paper p-4 shadow-card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-24 mb-1" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <div className="text-right">
                    <Skeleton className="h-5 w-16 mb-2" />
                    <Skeleton className="h-6 w-16 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {deliveryOrders.map((order: Order) => {
              const cfg = statusConfig[order.status] || statusConfig.PENDENTE
              const isExternal = Boolean(order.platform)
              const pending = order.status === "PENDENTE"
              return (
                <div key={order.id} className="border border-line rounded-lg bg-paper p-4 shadow-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-ink">
                          #{order.id.slice(0, 6)} — {order.customer}
                        </p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        {isExternal && (
                          <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-ink/5 text-muted">
                            <Store className="w-3 h-3" />
                            {order.platform === "99FOOD" ? "99Food" : "iFood"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {order.channel}
                        {order.deliveryAddress ? ` · ${order.deliveryAddress}` : ""}
                      </p>
                      <p className="text-xs text-muted mt-1">
                        {(order.items || []).length} itens · {order.createdAt ? new Date(order.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}
                      </p>
                      {order.pickupCode && (
                        <p className="mt-1 text-xs font-bold text-ink tracking-wider">
                          Retirada: <span className="text-base">{order.pickupCode}</span>
                        </p>
                      )}
                      {pending && isExternal && (
                        <p className={`mt-1 flex items-center gap-1 text-xs font-semibold ${isSlaUrgent(order.confirmBy) ? "text-danger" : "text-muted"}`}>
                          <Clock className="w-3 h-3" />
                          SLA: {formatSla(order.confirmBy)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-ink">R$ {order.total}</span>
                      <div className="mt-2 flex flex-col gap-1.5">
                        {canEdit && pending && (
                          <button
                            onClick={() => handleAccept(order.id)}
                            className="flex items-center justify-center gap-1 text-xs px-3 py-1.5 bg-ink text-paper rounded-lg font-medium hover:bg-ink/90 transition-colors"
                          >
                            <Check className="w-3 h-3" /> Aceitar
                          </button>
                        )}
                        {canEdit && !pending && order.status !== "CONCLUIDO" && (
                          <button
                            onClick={() => handleDeliverClick(order)}
                            className="flex items-center justify-center gap-1 text-xs px-3 py-1.5 bg-success/10 text-success rounded-lg font-medium hover:bg-success/20 transition-colors"
                          >
                            <Check className="w-3 h-3" /> Entregue
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            {deliveryOrders.length === 0 && (
              <div className="text-center py-8 text-muted border border-dashed border-line rounded-lg">
                Nenhum pedido de delivery {activeFilter !== "Todos" ? `(${activeFilter})` : ""}
              </div>
            )}
          </div>
        )}
      </div>

      {pickupCheck && (
        <div className="fixed inset-0 z-50 bg-ink/30 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="pickup-check-title">
          <div className="bg-paper rounded-xl border border-line shadow-lg w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-line">
              <h3 id="pickup-check-title" className="text-lg font-bold text-ink">Conferir retirada</h3>
              <button onClick={() => setPickupCheck(null)} aria-label="Fechar" className="p-1.5 rounded-md hover:bg-cream text-muted">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="border border-line rounded-lg bg-cream/50 p-3 text-center">
                <p className="text-xs text-muted uppercase tracking-wide mb-1">Código esperado</p>
                <p className="text-2xl font-bold tracking-[0.3em] text-ink">{pickupCheck.pickupCode}</p>
                <p className="text-xs text-muted mt-1">
                  Pedido #{pickupCheck.id.slice(0, 6)} · {pickupCheck.customer}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Código do cliente</label>
                <input
                  type="text"
                  value={pickupInput}
                  onChange={(e) => {
                    setPickupInput(e.target.value)
                    setPickupError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !checking) handlePickupConfirm()
                  }}
                  placeholder="Digite o código apresentado"
                  autoFocus
                  className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink tracking-[0.3em] uppercase placeholder:tracking-normal placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors"
                />
                {pickupError && <p className="text-xs font-medium text-danger mt-1">{pickupError}</p>}
              </div>
            </div>
            <div className="p-4 border-t border-line flex gap-2">
              <button onClick={() => setPickupCheck(null)} className="flex-1 h-10 border border-line rounded-lg text-sm font-medium text-ink hover:bg-cream transition-colors">
                Cancelar
              </button>
              <button
                onClick={handlePickupConfirm}
                disabled={checking}
                className="flex-1 h-10 bg-success text-paper rounded-lg text-sm font-medium hover:bg-success/90 transition-colors disabled:opacity-50"
              >
                {checking ? "Confirmando..." : "Confirmar retirada"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
