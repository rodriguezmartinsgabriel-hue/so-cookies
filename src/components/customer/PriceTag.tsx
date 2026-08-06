"use client"

import { motion } from "framer-motion"
import { Badge } from "@/components/ui/Badge"
import { formatBRL } from "@/lib/utils"
import type { AvailablePriceTier } from "@/hooks/usePricing"
import { useReducedMotion } from "@/hooks/useReducedMotion"

type PriceTagProps = {
  basePrice: number
  qty: number
  unit?: string
  tiers?: AvailablePriceTier[]
  /** Resultado do Pricing Engine — quando presente, sobrescreve o cálculo local. */
  resolvedUnitPrice?: number
  size?: "sm" | "md"
  className?: string
}

/**
 * Mostra o preço unitário com duas variantes:
 * - sem desconto:    R$ 10,00 / un
 * - com desconto:    R$ 8,00 ~~R$ 10,00~~  [-20%]
 *
 * Calcula o tier aplicável localmente a partir de `tiers` quando não há
 * `resolvedUnitPrice` (útil em pré-render ou no menu onde ainda não há pricing).
 * Troca numérica animada com micro-fade (120 ms).
 */
export function PriceTag({
  basePrice,
  qty,
  unit = "un",
  tiers,
  resolvedUnitPrice,
  size = "sm",
  className,
}: PriceTagProps) {
  const reducedMotion = useReducedMotion()
  const unitPrice = resolvedUnitPrice ?? resolveTierPrice(tiers, qty) ?? basePrice
  const hasDiscount = unitPrice < basePrice && basePrice > 0
  const savings = basePrice - unitPrice
  const pct = hasDiscount ? Math.round((savings / basePrice) * 100) : 0

  const textSize = size === "md" ? "text-sm" : "text-xs"
  const newSize = size === "md" ? "text-sm" : "text-xs"

  if (!hasDiscount) {
    return (
      <p className={`${textSize} text-muted ${className ?? ""}`}>
        <motion.span
          key={`flat-${formatBRL(basePrice)}`}
          initial={reducedMotion ? false : { opacity: 0.4 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.12 }}
        >
          {formatBRL(basePrice)} / {unit}
        </motion.span>
      </p>
    )
  }

  return (
    <div className={`flex items-baseline gap-1.5 flex-wrap ${className ?? ""}`}>
      <motion.span
        key={`new-${unitPrice.toFixed(2)}`}
        initial={reducedMotion ? false : { opacity: 0.4 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.12 }}
        className={`${newSize} font-semibold text-ink`}
      >
        {formatBRL(unitPrice)} / {unit}
      </motion.span>
      <motion.span
        key={`old-${basePrice.toFixed(2)}`}
        initial={reducedMotion ? false : { opacity: 0.4 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.12 }}
        className={`${textSize} text-muted line-through decoration-muted/60`}
      >
        {formatBRL(basePrice)}
      </motion.span>
      <Badge variant="success" aria-label={`Economia de ${pct}%`}>
        −{pct}%
      </Badge>
    </div>
  )
}

function resolveTierPrice(tiers: AvailablePriceTier[] | undefined, qty: number): number | null {
  if (!tiers || tiers.length === 0) return null
  if (qty <= 0) return null
  const tier = tiers.find((t) => t.minQty <= qty && (t.maxQty === null || t.maxQty >= qty))
  return tier ? tier.price : null
}
