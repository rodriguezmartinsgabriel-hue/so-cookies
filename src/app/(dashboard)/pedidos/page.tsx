"use client"

import { useState } from "react"
import { AppShell } from "@/components/layout/AppShell"
import { repository } from "@/lib/repository"
import { useOrders } from "@/hooks/useOrders"
import {
  Clock, CheckCircle, ChefHat, Package, Truck, X, Plus,
} from "lucide-react"

const columns = [
  { id: "PENDENTE", label: "Pendente", icon: Clock, color: "text-warning" },
  { id: "CONFIRMADO", label: "Confirmado", icon: CheckCircle, color: "text-info" },
  { id: "PRODUCAO", label: "Produção", icon: ChefHat, color: "text-ink" },
  { id: "PRONTO", label: "Pronto", icon: Package, color: "text-success" },
  { id: "ENTREGA", label: "Entrega", icon: Truck, color: "text-muted" },
] as const

const statusColors: Record<string, string> = {
  PENDENTE: "border-l-warning",
  CONFIRMADO: "border-l-info",
  PRODUCAO: "border-l-ink",
  PRONTO: "border-l-success",
  ENTREGA: "border-l-muted",
}

export default function PedidosPage() {
  const { orders, loading } = useOrders()
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null)
  const order = orders.find((o: any) => o.id === selectedOrder)

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    await repository.orders.updateStatus(orderId, newStatus)
    setSelectedOrder(null)
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-ink">Pedidos</h1>
          <button className="flex items-center gap-2 h-10 px-4 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors">
            <Plus className="w-4 h-4" />
            Novo Pedido
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted">Carregando...</div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 lg:mx-0 lg:px-0">
            {columns.map((col) => {
              const colOrders = orders.filter((o: any) => o.status === col.id)
              return (
                <div key={col.id} className="min-w-[280px] lg:min-w-0 lg:flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <col.icon className={`w-4 h-4 ${col.color}`} strokeWidth={1.5} />
                    <span className="text-sm font-semibold text-ink">{col.label}</span>
                    <span className="text-xs text-muted bg-cream px-2 py-0.5 rounded-full">{colOrders.length}</span>
                  </div>
                  <div className="space-y-2">
                    {colOrders.map((o: any) => (
                      <button
                        key={o.id}
                        onClick={() => setSelectedOrder(o.id)}
                        className={`w-full text-left p-3 border border-line rounded-lg bg-paper shadow-card hover:shadow-md transition-shadow border-l-4 ${statusColors[o.status] || ""}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-muted">#{o.id.slice(0, 6)}</span>
                          <span className="text-xs text-muted">{o.createdAt}</span>
                        </div>
                        <p className="text-sm font-medium text-ink truncate">{o.customer}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted">{o.channel} · {(o.items || []).length} itens</span>
                          <span className="text-sm font-bold text-ink">R$ {o.total}</span>
                        </div>
                      </button>
                    ))}
                    {colOrders.length === 0 && (
                      <div className="p-4 text-center text-xs text-muted border border-dashed border-line rounded-lg">Nenhum pedido</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {order && (
          <div className="fixed inset-0 z-50 bg-ink/30 flex items-center justify-center p-4">
            <div className="bg-paper rounded-xl border border-line shadow-lg w-full max-w-md max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-line">
                <div>
                  <h3 className="text-lg font-bold text-ink">Pedido #{order.id.slice(0, 6)}</h3>
                  <p className="text-xs text-muted">{order.channel} · {order.createdAt}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-1.5 rounded-md hover:bg-cream text-muted"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-xs text-muted uppercase tracking-wide mb-1">Cliente</p>
                  <p className="text-sm font-medium text-ink">{order.customer}</p>
                </div>
                <div>
                  <p className="text-xs text-muted uppercase tracking-wide mb-1">Itens</p>
                  <div className="space-y-1">
                    {(order.items || []).map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-ink">{item.qty}x {item.product?.name || item.product}</span>
                        <span className="text-muted">R$ {item.price * item.qty}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t border-line pt-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">Total</span>
                  <span className="text-lg font-bold text-ink">R$ {order.total}</span>
                </div>
              </div>
              <div className="p-4 border-t border-line flex gap-2">
                <button onClick={() => setSelectedOrder(null)} className="flex-1 h-10 border border-line rounded-lg text-sm font-medium text-ink hover:bg-cream transition-colors">Fechar</button>
                {order.status === "PENDENTE" && (
                  <button onClick={() => handleStatusChange(order.id, "CONFIRMADO")} className="flex-1 h-10 bg-info text-paper rounded-lg text-sm font-medium transition-colors">Confirmar</button>
                )}
                {order.status === "CONFIRMADO" && (
                  <button onClick={() => handleStatusChange(order.id, "PRODUCAO")} className="flex-1 h-10 bg-ink text-paper rounded-lg text-sm font-medium transition-colors">Produção</button>
                )}
                {order.status === "PRODUCAO" && (
                  <button onClick={() => handleStatusChange(order.id, "PRONTO")} className="flex-1 h-10 bg-success text-paper rounded-lg text-sm font-medium transition-colors">Pronto</button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}