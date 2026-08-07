"use client"

import { useState } from "react"
import type { KeyboardEvent } from "react"
import { useRouter } from "next/navigation"
import { Package, ChevronDown, ChevronRight } from "lucide-react"
import { Card } from "@/components/ui/Card"
import { useHapticFeedback } from "@/hooks/useHapticFeedback"
import { formatBRL } from "@/lib/utils"
import { type PublicOrder, statusLabel } from "@/lib/customer-types"

export function OrderHistoryCard({ orders }: { orders: PublicOrder[] }) {
  const router = useRouter()
  const haptic = useHapticFeedback()
  const [expanded, setExpanded] = useState(false)

  const toggle = () => {
    haptic.tap()
    setExpanded((v) => !v)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      toggle()
    }
  }

  const count = orders.length
  const countLabel = `${count} ${count === 1 ? "pedido" : "pedidos"}`

  return (
    <Card padded={false} variant="glass" className="rounded-2xl overflow-hidden">
      <header
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-controls="orders-panel"
        aria-label={expanded ? "Recolher histórico de pedidos" : "Ver histórico de pedidos"}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line/40 cursor-pointer select-none"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 text-accent">
            <Package className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.08em] text-muted font-semibold">Histórico</p>
            <h3 className="text-base font-semibold text-ink truncate">Meus pedidos</h3>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold text-accent bg-accent/10 rounded-full px-2.5 py-1">
            {countLabel}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-muted transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </div>
      </header>
      <div id="orders-panel" className="divide-y divide-line/30">
        {count === 0 ? (
          <div className="px-5 py-6 text-center">
            <p className="text-sm text-muted">Nenhum pedido ainda</p>
            <p className="text-xs text-muted mt-1">Seus pedidos confirmados vão aparecer aqui.</p>
          </div>
        ) : (
          expanded && (
            <ul>
              {orders.slice(0, 5).map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-3 px-5 py-3 hover:bg-cream/50
                               transition-colors cursor-pointer text-left"
                    onClick={() => {
                      haptic.tap()
                      router.push(`/pedido/${o.id}`)
                    }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">
                        #{o.id.slice(0, 6)} · {new Date(o.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                      <p className="text-xs text-muted">
                        {o.items.reduce((s, i) => s + i.qty, 0)} itens · {formatBRL(o.total)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-medium text-ink">{statusLabel[o.status]}</span>
                      <ChevronRight className="w-4 h-4 text-muted" />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )
        )}
      </div>
    </Card>
  )
}
