"use client"

import { motion } from "framer-motion"
import { TrendingUp } from "lucide-react"
import type { AvailablePriceTier } from "@/hooks/usePricing"
import { formatBRL } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/hooks/useReducedMotion"

type VolumeDiscountHintProps = {
  tiers: AvailablePriceTier[] | undefined
  qty: number
  basePrice: number
  className?: string
}

/**
 * Mostra a faixa ativa ("Leve 10 — R$ 7,50/un") e a progressão para a próxima
 * ("Faltam 2 para R$ 7,50/un") com barra fininha. Visual sóbrio, em token
 * accent para combinar com o resto do app sem chamar atenção demais.
 *
 * Esconde-se quando não há tiers configurados ou qty = 0.
 */
export function VolumeDiscountHint({ tiers, qty, basePrice, className }: VolumeDiscountHintProps) {
  const reducedMotion = useReducedMotion()

  if (!tiers || tiers.length === 0) return null
  if (qty <= 0) return null

  // Tiers vêm ordenados por minQty ascendente (ver PricingRepository.getActivePriceTiersForProducts).
  const activeTier = tiers.find((t) => t.minQty <= qty && (t.maxQty === null || t.maxQty >= qty))
  const nextTier = tiers.find((t) => t.minQty > qty)
  const unlockedTiers = tiers.filter((t) => t.minQty <= qty)

  if (!activeTier && !nextTier) return null

  const remaining = nextTier ? nextTier.minQty - qty : 0
  const progressPct = nextTier
    ? Math.min(100, Math.round((qty / nextTier.minQty) * 100))
    : 100

  return (
    <div
      className={cn(
        "rounded-lg border-l-2 border-accent/40 bg-accent/5 px-2.5 py-1.5 text-[11px] text-muted",
        "flex flex-col gap-1",
        className,
      )}
    >
      {activeTier && (
        <p className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3 text-accent" strokeWidth={2} aria-hidden="true" />
          <span className="font-medium text-ink">
            Leve {activeTier.minQty}
          </span>
          <span className="text-muted">—</span>
          <span className="font-semibold text-accent">{formatBRL(activeTier.price)}/{basePrice ? "un" : ""}</span>
          {unlockedTiers.length > 1 && unlockedTiers.length < tiers.length && (
            <span className="ml-auto text-[10px] text-muted">
              {unlockedTiers.length}/{tiers.length} faixas
            </span>
          )}
        </p>
      )}

      {nextTier && remaining > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted leading-tight">
            Faltam <span className="font-semibold text-ink">{remaining}</span> para{" "}
            <span className="font-semibold text-accent">{formatBRL(nextTier.price)}/un</span>
          </p>
          <div className="h-1 w-full rounded-full bg-accent/15 overflow-hidden">
            <motion.div
              key={`progress-${qty}`}
              className="h-full bg-accent rounded-full"
              initial={reducedMotion ? false : { width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
