"use client"

import { useState, useCallback } from "react"
import { Plus, Minus, Cookie } from "lucide-react"
import NextImage from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import type { CatalogProduct } from "@/lib/utils"
import { formatBRL } from "@/lib/utils"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { CalorieBadge } from "@/components/ui/CalorieBadge"
import { useHapticFeedback } from "@/hooks/useHapticFeedback"
import { ProductCardExpandable } from "./ProductCardExpandable"

type ProductCardProps = {
  product: CatalogProduct
  qty: number
  onAdd: () => void
  onSetQty: (qty: number) => void
}

const ALLERGEN_LABELS: Record<string, string> = {
  GLUTEN: "Glúten",
  LACTOSE: "Lactose",
  OVO: "Ovo",
  SOJA: "Soja",
  FRUTOS_SECOS: "Frutos secos",
  AMENDOIM: "Amendoim",
  LEITE: "Leite",
  CASTANHAS: "Castanhas",
}

const TAG_LABELS: Record<string, string> = {
  VEGANO: "Vegano",
  VEGETARIANO: "Vegetariano",
  SEM_GLUTEN: "Sem glúten",
  SEM_LACTOSE: "Sem lactose",
}

export function ProductCard({
  product,
  qty,
  onAdd,
  onSetQty,
}: ProductCardProps) {
  const [expanded, setExpanded] = useState(false)
  const haptic = useHapticFeedback()

  const handleTap = useCallback(() => {
    haptic.tap()
    setExpanded(true)
  }, [haptic])

  const handleClose = useCallback(() => {
    setExpanded(false)
  }, [])

  const n = product.nutrition

  return (
    <>
      <Card
        padded={false}
        interactive
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={handleTap}
        role="button"
        tabIndex={0}
        aria-label={`Ver detalhes de ${product.name}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            handleTap()
          }
        }}
      >
        <div className="relative shrink-0">
          {product.image ? (
            <NextImage
              src={product.image}
              alt={product.name}
              width={64}
              height={64}
              unoptimized
              className="w-16 h-16 rounded-xl object-cover drop-shadow-[0_4px_12px_rgba(0,0,0,0.12)]"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-cream border border-line flex items-center justify-center">
              <Cookie className="w-6 h-6 text-kraft" strokeWidth={1.5} />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink truncate">{product.name}</p>
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            <p className="text-xs text-muted">{formatBRL(product.price)} / {product.unit}</p>
            <CalorieBadge calories={n?.caloriesPerUnit ?? null} variant="inline" />
          </div>

          {n?.tags && n.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {n.tags.slice(0, 3).map((t) => (
                <span key={t} className="inline-flex items-center rounded-md bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                  {TAG_LABELS[t] ?? t}
                </span>
              ))}
            </div>
          )}

          {n && n.allergens.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {n.allergens.map((a) => (
                <span key={a} className="inline-flex items-center rounded-md bg-danger/10 px-2 py-0.5 text-[11px] font-medium text-danger">
                  {ALLERGEN_LABELS[a] ?? a}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0">
          {qty === 0 ? (
            <Button variant="primary" size="sm" onClick={(e) => { e.stopPropagation(); onAdd() }}>
              <Plus className="w-4 h-4" />
            </Button>
          ) : (
            <div className="flex items-center gap-1">
              <Button variant="secondary" size="icon" onClick={(e) => { e.stopPropagation(); onSetQty(qty - 1) }} aria-label={`Diminuir ${product.name}`}>
                <Minus className="w-3 h-3" />
              </Button>
              <span className="w-5 text-center text-xs font-semibold text-ink">{qty}</span>
              <Button variant="primary" size="icon" onClick={(e) => { e.stopPropagation(); onSetQty(qty + 1) }} aria-label={`Aumentar ${product.name}`}>
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      </Card>

      <AnimatePresence>
        {expanded && (
          <ProductCardExpandable
            product={product}
            qty={qty}
            onAdd={onAdd}
            onSetQty={onSetQty}
            onClose={handleClose}
          />
        )}
      </AnimatePresence>
    </>
  )
}