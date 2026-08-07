"use client"

import { Sparkles, ChevronDown } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface ProfilePointsCardProps {
  balance: number
  lifetimeEarned: number
  lifetimeSpent: number
  pointsPerReal: number
  /** Handler do botão "Ver histórico completo". */
  onViewHistory?: () => void
}

export function ProfilePointsCard({
  balance,
  lifetimeEarned,
  lifetimeSpent,
  pointsPerReal,
  onViewHistory,
}: ProfilePointsCardProps) {
  const isEmpty = balance === 0 && lifetimeEarned === 0

  return (
    <div className="rounded-xl bg-accent/5 border border-accent/20 px-4 py-3.5 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-accent">
          <span className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
            <Sparkles className="w-4 h-4" strokeWidth={2.25} />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.08em]">Seus pontos</span>
        </div>
        {!isEmpty && onViewHistory && (
          <button
            type="button"
            onClick={onViewHistory}
            className="inline-flex items-center gap-0.5 text-[11px] font-medium text-accent
                       hover:text-accent/80 transition-colors"
            aria-label="Ver histórico completo de pontos"
          >
            Ver histórico
            <ChevronDown className="w-3 h-3" />
          </button>
        )}
      </div>

      {isEmpty ? (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-ink">Comece a acumular pontos ✨</p>
          <p className="text-xs text-muted leading-relaxed">
            Você ganha{" "}
            <strong className="text-accent">
              {pointsPerReal} ponto{pointsPerReal === 1 ? "" : "s"}
            </strong>{" "}
            por cada R$ 1,00 gasto em pedidos confirmados.
          </p>
        </div>
      ) : (
        <>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${balance}-${lifetimeEarned}-${lifetimeSpent}`}
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-baseline gap-2"
            >
              <span className="text-3xl font-bold text-accent leading-none tabular-nums">
                {balance}
              </span>
              <span className="text-sm text-muted">pts disponíveis</span>
            </motion.div>
          </AnimatePresence>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="rounded-lg bg-paper/60 border border-line/30 px-2.5 py-1.5">
              <p className="text-[10px] text-muted uppercase tracking-wide">Conquistados</p>
              <p className="text-sm font-bold text-success tabular-nums leading-tight">
                {lifetimeEarned}
              </p>
            </div>
            <div className="rounded-lg bg-paper/60 border border-line/30 px-2.5 py-1.5">
              <p className="text-[10px] text-muted uppercase tracking-wide">Resgatados</p>
              <p className="text-sm font-bold text-muted tabular-nums leading-tight">
                {lifetimeSpent}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
