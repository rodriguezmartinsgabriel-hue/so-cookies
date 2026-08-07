"use client"

import { Sparkles, TrendingUp } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface LoyaltyPreviewProps {
  preview?: {
    active: boolean
    currentBalance: number
    pointsToEarn: number
    projectedAfter: number
    ruleName: string
  }
}

export function LoyaltyPreview({ preview }: LoyaltyPreviewProps) {
  if (!preview || !preview.active) return null

  const { currentBalance, pointsToEarn, projectedAfter } = preview

  if (pointsToEarn <= 0 && currentBalance === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-xl border border-accent/30 bg-accent/5 px-3 py-2.5 space-y-1"
    >
      <div className="flex items-center gap-1.5 text-accent">
        <Sparkles className="w-4 h-4" strokeWidth={2} />
        <span className="text-xs font-semibold uppercase tracking-wide">Programa de Pontos</span>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={`${currentBalance}-${pointsToEarn}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="text-sm text-ink"
        >
          {pointsToEarn > 0 ? (
            <>
              Você ganhará{" "}
              <strong className="text-accent">+{pointsToEarn} pontos</strong> nesta compra
            </>
          ) : (
            <>
              Sua compra não pontua{" "}
              <span className="text-muted text-xs">(valor mínimo não atingido)</span>
            </>
          )}
        </motion.p>
      </AnimatePresence>

      <div className="flex items-center justify-between text-xs text-muted pt-1">
        <span>
          Saldo atual: <strong className="text-ink font-semibold">{currentBalance} pts</strong>
        </span>
        {pointsToEarn > 0 && (
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Após esta compra:{" "}
            <strong className="text-ink font-semibold">{projectedAfter} pts</strong>
          </span>
        )}
      </div>
    </motion.div>
  )
}
