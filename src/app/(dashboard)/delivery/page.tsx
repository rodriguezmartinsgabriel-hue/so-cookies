"use client"

import { useState, useEffect, useRef } from "react"
import { useRole } from "@/hooks/useRole"
import { useQueryData } from "@/hooks/useQueryData"
import { AppShell } from "@/components/layout/AppShell"
import { Skeleton } from "@/components/ui/Skeleton"
import { ErrorState } from "@/components/ui/ErrorState"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { FormField } from "@/components/ui/FormField"
import { Badge } from "@/components/ui/Badge"
import { Modal } from "@/components/ui/Modal"
import { MapPin, Check, Clock, Store, Bell, BellOff } from "lucide-react"
import { repository } from "@/lib/repository"
import type { Order } from "@/lib/entity-types"
import { isSoundEnabled, setSoundEnabled, playNotificationSound } from "@/lib/sound"

const statusConfig: Record<
  string,
  { label: string; variant: "neutral" | "success" | "warning" | "danger" | "info" | "accent" }
> = {
  PENDENTE: { label: "Pendente", variant: "warning" },
  CONFIRMADO: { label: "Confirmado", variant: "info" },
  PRODUCAO: { label: "Em Produção", variant: "info" },
  PRONTO: { label: "Pronto p/ Retirada", variant: "success" },
  ENTREGA: { label: "Em Rota", variant: "info" },
  CONCLUIDO: { label: "Entregue", variant: "neutral" },
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
  const { canEdit } = useRole()
  const { data: orders, isLoading: loading, error: ordersError, invalidate } = useQueryData("orders")
  const error = ordersError ? "Erro ao carregar entregas" : null
  const [activeFilter, setActiveFilter] = useState("Todos")
  const [routes, setRoutes] = useState<{ id: string; name: string; active: boolean }[]>([])
  const [routeFilter, setRouteFilter] = useState<string>("all")
  const [soundOn, setSoundOn] = useState<boolean>(() => isSoundEnabled())
  const [pickupCheck, setPickupCheck] = useState<Order | null>(null)
  const [pickupInput, setPickupInput] = useState("")
  const [pickupError, setPickupError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const seenNew = useRef<Set<string> | null>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      invalidate()
    }, 30_000)
    return () => clearInterval(interval)
  }, [invalidate])

  useEffect(() => {
    fetch("/api/delivery-routes")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setRoutes(data))
      .catch(() => {})
  }, [])

  const routeName = (id: string | null | undefined) => routes.find((r) => r.id === id)?.name ?? null

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
    .filter((o: Order) => routeFilter === "all" || o.deliveryRouteId === routeFilter)

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
            <p className="text-sm text-muted">{deliveryOrders.length} pedidos de delivery</p>
          </div>
          <Button
            onClick={toggleSound}
            variant="secondary"
            size="sm"
            className="h-auto px-3 py-1.5 text-xs"
            aria-label={soundOn ? "Desativar som de novos pedidos" : "Ativar som de novos pedidos"}
          >
            {soundOn ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
            {soundOn ? "Som on" : "Som off"}
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {channelFilters.map((ch) => (
            <button
              key={ch}
              onClick={() => setActiveFilter(ch)}
              className={`h-8 px-3 border rounded-full text-xs font-medium transition-colors shrink-0 ${
                activeFilter === ch ? "border-ink bg-ink text-paper" : "border-line text-ink hover:bg-cream"
              }`}
            >
              {ch}
            </button>
          ))}
          {routes
            .filter((r) => r.active)
            .map((r) => (
              <button
                key={r.id}
                onClick={() => setRouteFilter(routeFilter === r.id ? "all" : r.id)}
                className={`h-8 px-3 border rounded-full text-xs font-medium transition-colors shrink-0 ${
                  routeFilter === r.id ? "border-ink bg-ink text-paper" : "border-line text-ink hover:bg-cream"
                }`}
              >
                {r.name}
              </button>
            ))}
        </div>

        {error && <ErrorState message={error} onRetry={invalidate} />}

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
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
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {deliveryOrders.map((order: Order) => {
              const cfg = statusConfig[order.status] || statusConfig.PENDENTE
              const isExternal = Boolean(order.platform)
              const pending = order.status === "PENDENTE"
              return (
                <Card key={order.id}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-ink">
                          #{order.id.slice(0, 6)} — {order.customer}
                        </p>
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                        {isExternal && (
                          <Badge variant="neutral">
                            <Store className="w-3 h-3" />
                            {order.platform === "99FOOD" ? "99Food" : "iFood"}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {order.channel}
                        {order.deliveryAddress ? ` · ${order.deliveryAddress}` : ""}
                        {order.deliveryDate ? ` · ${new Date(order.deliveryDate).toLocaleDateString("pt-BR")}` : ""}
                      </p>
                      {routeName(order.deliveryRouteId) && (
                        <p className="text-xs font-medium text-info mt-1">{routeName(order.deliveryRouteId)}</p>
                      )}
                      <p className="text-xs text-muted mt-1">
                        {(order.items || []).length} itens ·{" "}
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </p>
                      {order.pickupCode && (
                        <p className="mt-1 text-xs font-bold text-ink tracking-wider">
                          Retirada: <span className="text-base">{order.pickupCode}</span>
                        </p>
                      )}
                      {pending && isExternal && (
                        <p
                          className={`mt-1 flex items-center gap-1 text-xs font-semibold ${isSlaUrgent(order.confirmBy) ? "text-danger" : "text-muted"}`}
                        >
                          <Clock className="w-3 h-3" />
                          SLA: {formatSla(order.confirmBy)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-ink">R$ {order.total}</span>
                      <div className="mt-2 flex flex-col gap-1.5">
                        {canEdit && pending && (
                          <Button
                            onClick={() => handleAccept(order.id)}
                            size="sm"
                            className="h-auto px-3 py-1.5 text-xs"
                          >
                            <Check className="w-3 h-3" /> Aceitar
                          </Button>
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
                </Card>
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
        <Modal
          open
          onClose={() => setPickupCheck(null)}
          title="Conferir retirada"
          size="sm"
          footer={
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setPickupCheck(null)}>
                Cancelar
              </Button>
              <button
                onClick={handlePickupConfirm}
                disabled={checking}
                className="flex-1 h-10 bg-success text-paper rounded-lg text-sm font-medium hover:bg-success/90 transition-colors disabled:opacity-50"
              >
                {checking ? "Confirmando..." : "Confirmar retirada"}
              </button>
            </div>
          }
        >
          <div className="p-4 space-y-4">
            <div className="border border-line rounded-lg bg-cream/50 p-3 text-center">
              <p className="text-xs text-muted uppercase tracking-wide mb-1">Código esperado</p>
              <p className="text-2xl font-bold tracking-[0.3em] text-ink">{pickupCheck.pickupCode}</p>
              <p className="text-xs text-muted mt-1">
                Pedido #{pickupCheck.id.slice(0, 6)} · {pickupCheck.customer}
              </p>
            </div>
            <FormField label="Código do cliente" error={pickupError ?? undefined}>
              <Input
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
                className="tracking-[0.3em] uppercase placeholder:tracking-normal"
              />
            </FormField>
          </div>
        </Modal>
      )}
    </AppShell>
  )
}
