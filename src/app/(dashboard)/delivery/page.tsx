"use client"

import { useState, useEffect, useCallback } from "react"
import { AppShell } from "@/components/layout/AppShell"
import { Skeleton } from "@/components/ui/Skeleton"
import { ErrorState } from "@/components/ui/ErrorState"
import { MapPin, Check, Truck } from "lucide-react"
import { repository } from "@/lib/repository"

const statusConfig: Record<string, { label: string; color: string }> = {
  ENTREGA: { label: "Em Rota", color: "text-info bg-info/10" },
  PRONTO: { label: "Pronto p/ Retirada", color: "text-success bg-success/10" },
  CONCLUIDO: { label: "Entregue", color: "text-muted bg-cream" },
}

const channelFilters = ["Todos", "iFood", "Rappi", "WhatsApp", "Direto"]

export default function DeliveryPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState("Todos")

  const loadOrders = useCallback(async () => {
    setLoading(true)
    try {
      const resp = await fetch("/api/orders")
      if (resp.ok) setOrders(await resp.json())
    } catch {
      setError("Erro ao carregar entregas")
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadOrders() }, [loadOrders])

  const deliveryOrders = orders
    .filter((o: any) => ["ENTREGA", "PRONTO", "CONCLUIDO"].includes(o.status))
    .filter((o: any) => activeFilter === "Todos" || o.channel === activeFilter)

  async function handleMarkDelivered(id: string) {
    await repository.orders.updateStatus(id, "CONCLUIDO")
    await loadOrders()
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Delivery</h1>
          <p className="text-sm text-muted">
            {deliveryOrders.length} pedidos de delivery
          </p>
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
          <ErrorState message={error} onRetry={loadOrders} />
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
            {deliveryOrders.map((order: any) => {
              const cfg = statusConfig[order.status] || statusConfig.ENTREGA
              return (
                <div key={order.id} className="border border-line rounded-lg bg-paper p-4 shadow-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-ink">
                          #{order.id.slice(0, 6)} — {order.customer}
                        </p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {order.channel}
                      </p>
                      <p className="text-xs text-muted mt-1">
                        {(order.items || []).length} itens · {order.createdAt ? new Date(order.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-ink">R$ {order.total}</span>
                      <div className="mt-2">
                        {order.status !== "CONCLUIDO" && (
                          <button
                            onClick={() => handleMarkDelivered(order.id)}
                            className="flex items-center gap-1 text-xs px-3 py-1.5 bg-success/10 text-success rounded-lg font-medium hover:bg-success/20 transition-colors"
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
    </AppShell>
  )
}
