"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Check, Package, Clock, Store } from "lucide-react"
import { CustomerShell } from "@/components/customer/CustomerShell"

type PublicOrderItem = {
  id: string
  qty: number
  price: number
  product: { id: string; name: string } | null
  name: string | null
}

type PublicOrder = {
  id: string
  status: string
  total: number
  pickupCode: string | null
  notes: string | null
  createdAt: string
  items: PublicOrderItem[]
}

const statusOrder = ["PENDENTE", "CONFIRMADO", "PRODUCAO", "PRONTO", "CONCLUIDO"]

const statusLabel: Record<string, string> = {
  PENDENTE: "Recebido",
  CONFIRMADO: "Confirmado",
  PRODUCAO: "Em produção",
  PRONTO: "Pronto para retirar",
  ENTREGA: "Em entrega",
  CONCLUIDO: "Finalizado",
  CANCELADO: "Cancelado",
}

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

export default function PedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const [order, setOrder] = useState<PublicOrder | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/public/orders/${id}`, { cache: "no-store" })
      if (res.status === 404) {
        setNotFound(true)
        setOrder(null)
        return
      }
      if (!res.ok) return
      const data = await res.json()
      setOrder(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null
    let cancelled = false

    params.then(({ id }) => {
      if (cancelled) return
      load(id)
      interval = setInterval(() => load(id), 10_000)
    })

    return () => {
      cancelled = true
      if (interval) clearInterval(interval)
    }
  }, [params, load])

  const stepIndex = order ? statusOrder.indexOf(order.status) : -1
  const cancelled = order?.status === "CANCELADO"

  return (
    <CustomerShell>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Pedido</h1>
          {order && (
            <p className="text-sm text-muted">
              #{order.id.slice(0, 6)} · {new Date(order.createdAt).toLocaleString("pt-BR")}
            </p>
          )}
        </div>

        {loading && <div className="text-center py-12 text-muted">Carregando pedido...</div>}

        {!loading && notFound && (
          <div className="text-center py-12 text-muted">Pedido não encontrado</div>
        )}

        {!loading && order && (
          <>
            {cancelled ? (
              <div className="border border-danger/30 bg-danger/5 rounded-lg p-4">
                <p className="font-semibold text-danger">Pedido cancelado</p>
                <p className="text-sm text-muted mt-1">Entre em contato com a loja para mais informações.</p>
              </div>
            ) : (
              <>
                <div className="border border-line rounded-lg bg-paper p-4 shadow-card text-center">
                  <p className="text-xs text-muted uppercase tracking-wide mb-1">Código de retirada</p>
                  <p className="text-3xl font-bold tracking-[0.3em] text-ink">{order.pickupCode ?? "---"}</p>
                  <p className="text-xs text-muted mt-1 flex items-center justify-center gap-1">
                    <Store className="w-3 h-3" /> Retirada na loja
                  </p>
                </div>

                <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-ink flex items-center gap-1.5">
                      <Package className="w-4 h-4" /> Status
                    </p>
                    <span className="text-sm font-semibold text-ink">{statusLabel[order.status]}</span>
                  </div>

                  {stepIndex >= 0 && !cancelled && (
                    <ol className="space-y-3">
                      {statusOrder.map((st, idx) => {
                        const done = idx <= stepIndex
                        const isCurrent = idx === stepIndex
                        return (
                          <li key={st} className="flex items-center gap-3">
                            <span
                              className={`w-6 h-6 flex items-center justify-center rounded-full ${
                                done ? "bg-success text-paper" : "bg-cream text-muted border border-line"
                              }`}
                            >
                              {done && <Check className="w-4 h-4" />}
                            </span>
                            <span
                              className={`text-sm ${isCurrent ? "font-semibold text-ink" : done ? "text-ink" : "text-muted"}`}
                            >
                              {statusLabel[st]}
                            </span>
                            {isCurrent && <Clock className="w-3.5 h-3.5 text-muted" />}
                          </li>
                        )
                      })}
                    </ol>
                  )}
                </div>

                <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
                  <p className="text-sm font-semibold text-ink mb-2">Itens</p>
                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <span className="text-ink">
                          {item.qty}x {item.product?.name ?? item.name ?? "Item"}
                        </span>
                        <span className="text-muted">{formatBRL(item.price * item.qty)}</span>
                      </div>
                    ))}
                  </div>
                  {order.notes && (
                    <p className="text-xs text-muted mt-3 border-t border-line pt-2">Obs: {order.notes}</p>
                  )}
                  <div className="flex items-center justify-between border-t border-line mt-3 pt-3">
                    <span className="font-semibold text-ink">Total</span>
                    <span className="font-bold text-ink">{formatBRL(order.total)}</span>
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-center">
              <Link href="/cardapio" className="text-sm text-ink underline">
                Fazer novo pedido
              </Link>
            </div>
          </>
        )}
      </div>
    </CustomerShell>
  )
}
