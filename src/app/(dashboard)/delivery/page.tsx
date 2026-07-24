"use client"

import { useState, useEffect } from "react"
import { AppShell } from "@/components/layout/AppShell"
import { MapPin } from "lucide-react"

const statusConfig: Record<string, { label: string; color: string }> = {
  ENTREGA: { label: "Em Rota", color: "text-success bg-success/10" },
  PENDENTE: { label: "Aguardando", color: "text-warning bg-warning/10" },
  CONCLUIDO: { label: "Entregue", color: "text-muted bg-cream" },
}

const channelFilters = ["Todos", "iFood", "Rappi", "WhatsApp", "Direto"]

export default function DeliveryPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState("Todos")

  useEffect(() => {
    loadOrders()
  }, [])

  async function loadOrders() {
    setLoading(true)
    try {
      const resp = await fetch("/api/orders")
      if (resp.ok) setOrders(await resp.json())
    } catch {}
    setLoading(false)
  }

  const filtered = orders
    .filter((o: any) => activeFilter === "Todos" || o.channel === activeFilter)

  return (
    <AppShell>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-ink">Delivery</h1>

        <div className="flex gap-2 overflow-x-auto">
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

        {loading ? (
          <div className="text-center py-8 text-muted">Carregando...</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((order: any) => {
              const cfg = statusConfig[order.status] || statusConfig.PENDENTE
              return (
                <div
                  key={order.id}
                  className="border border-line rounded-lg bg-paper p-4 shadow-card"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-ink">
                          #{order.id.slice(0, 6)} — {order.customer}
                        </p>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}
                        >
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {order.channel}
                      </p>
                      <p className="text-xs text-muted mt-1">
                        {order.channel} · {(order.items || []).length} itens
                      </p>
                    </div>
                    <span className="text-sm font-bold text-ink">
                      R$ {order.total}
                    </span>
                  </div>
                  {order.status === "PENDENTE" && (
                    <button className="mt-3 w-full h-9 border border-line rounded-lg text-xs font-medium text-ink hover:bg-cream transition-colors">
                      Designar Motorista
                    </button>
                  )}
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div className="text-center py-8 text-muted border border-dashed border-line rounded-lg">Nenhum pedido de delivery</div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
