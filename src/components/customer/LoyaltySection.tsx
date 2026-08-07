"use client"

import { useEffect, useState } from "react"
import { Sparkles, TrendingUp, TrendingDown, Gift, ChevronRight, Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/Button"
import { useHapticFeedback } from "@/hooks/useHapticFeedback"

interface BalanceResponse {
  balance: number
  lifetimeEarned: number
  lifetimeSpent: number
  active: boolean
  pointsPerReal: number
}

interface TransactionView {
  id: string
  type: "EARN" | "REDEEM" | "REFUND" | "ADJUSTMENT" | "EXPIRE"
  points: number
  balanceAfter: number
  reason: string
  orderId: string | null
  createdAt: string
}

interface TransactionsResponse {
  items: TransactionView[]
  nextCursor: string | null
}

interface RewardView {
  id: string
  name: string
  description: string | null
  image: string | null
  pointsCost: number
  type: "DISCOUNT_FIXED" | "DISCOUNT_PERCENTAGE" | "FREE_PRODUCT" | "FREE_SHIPPING"
  enabled: boolean
  stock: number | null
}

export function LoyaltySection() {
  const haptic = useHapticFeedback()
  const [balance, setBalance] = useState<BalanceResponse | null>(null)
  const [txs, setTxs] = useState<TransactionsResponse | null>(null)
  const [rewards, setRewards] = useState<RewardView[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [redeemHint, setRedeemHint] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [b, t, r] = await Promise.all([
          fetch("/api/public/loyalty/balance").then((res) => (res.ok ? res.json() : null)),
          fetch("/api/public/loyalty/transactions?limit=20").then((res) => (res.ok ? res.json() : null)),
          fetch("/api/public/loyalty/rewards").then((res) => (res.ok ? res.json() : null)),
        ])
        if (cancelled) return
        setBalance(b)
        setTxs(t)
        setRewards(r?.items ?? [])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  function handleRedeemClick(reward: RewardView) {
    setRedeemHint(
      `Resgate de "${reward.name}" estará disponível em breve. Continue acumulando pontos! 🤎`,
    )
    haptic.tap()
    setTimeout(() => setRedeemHint(null), 4000)
  }

  if (loading) {
    return (
      <section className="rounded-2xl border border-line/50 bg-cream/30 px-4 py-6 flex items-center justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-muted" />
      </section>
    )
  }

  if (!balance || !balance.active) {
    return null
  }

  const txItems = txs?.items ?? []
  const hasRewards = rewards && rewards.length > 0

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border border-accent/30 bg-accent/5 p-4 space-y-4"
      id="pontos"
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent" strokeWidth={2} />
          <h2 className="text-base font-bold text-ink">Seus pontos</h2>
        </div>
        {hasRewards && <span className="text-[10px] uppercase tracking-wide text-accent">Prêmios disponíveis</span>}
      </header>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-paper/60 px-2 py-3 border border-line/50">
          <p className="text-[10px] text-muted uppercase tracking-wide">Saldo</p>
          <p className="text-xl font-bold text-accent leading-tight">{balance.balance}</p>
          <p className="text-[10px] text-muted">pontos</p>
        </div>
        <div className="rounded-lg bg-paper/60 px-2 py-3 border border-line/50">
          <p className="text-[10px] text-muted uppercase tracking-wide">Conquistados</p>
          <p className="text-xl font-bold text-success leading-tight">{balance.lifetimeEarned}</p>
          <p className="text-[10px] text-muted">pontos</p>
        </div>
        <div className="rounded-lg bg-paper/60 px-2 py-3 border border-line/50">
          <p className="text-[10px] text-muted uppercase tracking-wide">Resgatados</p>
          <p className="text-xl font-bold text-muted leading-tight">{balance.lifetimeSpent}</p>
          <p className="text-[10px] text-muted">pontos</p>
        </div>
      </div>

      {balance.balance === 0 && balance.lifetimeEarned === 0 && (
        <div className="rounded-lg border border-line/50 bg-paper/40 px-3 py-3 text-sm text-ink">
          <p className="font-semibold">Comece a acumular pontos!</p>
          <p className="text-xs text-muted mt-1">
            Você ganha <strong className="text-accent">{balance.pointsPerReal} ponto(s)</strong> por cada R$ 1,00 gasto
            em pedidos confirmados. Continue comprando e troque por prêmios exclusivos.
          </p>
        </div>
      )}

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-2 px-1">Histórico</h3>
        {txItems.length === 0 ? (
          <div className="rounded-lg border border-line/50 bg-paper/40 px-3 py-4 text-center text-xs text-muted">
            Nenhuma movimentação ainda.
          </div>
        ) : (
          <ul className="divide-y divide-line/30 rounded-lg border border-line/50 bg-paper/40 overflow-hidden">
            {txItems.map((t) => (
              <li key={t.id} className="px-3 py-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {t.type === "EARN" || t.type === "ADJUSTMENT" ? (
                    <TrendingUp className="w-4 h-4 text-success shrink-0" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-danger shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm text-ink truncate">{t.reason}</p>
                    <p className="text-[10px] text-muted">
                      {new Date(t.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={`text-sm font-bold ${
                      t.type === "EARN" || t.type === "ADJUSTMENT" ? "text-success" : "text-danger"
                    }`}
                  >
                    {t.type === "EARN" || t.type === "ADJUSTMENT" ? "+" : "-"}
                    {t.points}
                  </p>
                  <p className="text-[10px] text-muted">{t.balanceAfter} pts</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-2 px-1 flex items-center gap-1.5">
          <Gift className="w-3.5 h-3.5" />
          Prêmios {hasRewards ? "" : "(em breve)"}
        </h3>
        {!hasRewards ? (
          <div className="rounded-lg border border-dashed border-accent/30 bg-accent/5 px-3 py-4 text-center">
            <Gift className="w-5 h-5 text-accent mx-auto mb-1.5" />
            <p className="text-sm font-semibold text-ink">Em breve você poderá trocar pontos!</p>
            <p className="text-xs text-muted mt-1">
              Descontos, brindes e frete grátis estão chegando. Continue acumulando para resgatar quando
              lançarmos 🤎
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {rewards.map((r) => {
              const canAfford = balance.balance >= r.pointsCost
              return (
                <li
                  key={r.id}
                  className="rounded-lg border border-line/50 bg-paper/60 px-3 py-2.5 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">{r.name}</p>
                    {r.description && <p className="text-xs text-muted truncate">{r.description}</p>}
                    <p className="text-xs text-accent font-bold mt-0.5">{r.pointsCost} pontos</p>
                  </div>
                  <Button
                    size="sm"
                    variant={canAfford ? "primary" : "secondary"}
                    disabled={!canAfford}
                    onClick={() => handleRedeemClick(r)}
                  >
                    {canAfford ? "Resgatar" : `Faltam ${r.pointsCost - balance.balance}`}
                    {canAfford && <ChevronRight className="w-3.5 h-3.5" />}
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {redeemHint && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-success/10 border border-success/30 px-3 py-2 text-xs text-success"
        >
          {redeemHint}
        </motion.div>
      )}
    </motion.section>
  )
}
