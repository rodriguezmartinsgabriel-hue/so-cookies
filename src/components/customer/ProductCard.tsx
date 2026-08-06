"use client"

import { useCallback } from "react"
import { Plus, Minus, Cookie, ChevronDown } from "lucide-react"
import NextImage from "next/image"
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
  isExpanded: boolean
  onExpand: () => void
  onCollapse: () => void
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

export function ProductCard({ product, qty, isExpanded, onExpand, onCollapse, onAdd, onSetQty }: ProductCardProps) {
  const haptic = useHapticFeedback()
  const n = product.nutrition

  const handleHeaderClick = useCallback(() => {
    haptic.tap()
    if (isExpanded) {
      onCollapse()
    } else {
      onExpand()
    }
  }, [haptic, isExpanded, onExpand, onCollapse])

  const handleHeaderKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        handleHeaderClick()
      }
    },
    [handleHeaderClick],
  )

  const handleAdd = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      haptic.tap()
      onAdd()
    },
    [haptic, onAdd],
  )

  const handleDec = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (qty <= 0) return
      haptic.tap()
      onSetQty(qty - 1)
    },
    [haptic, onSetQty, qty],
  )

  const handleInc = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      haptic.tap()
      onSetQty(qty + 1)
    },
    [haptic, onSetQty, qty],
  )

  return (
    <Card padded={false} interactive className="block p-0 overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-controls={`panel-${product.id}`}
        aria-label={isExpanded ? `Recolher ${product.name}` : `Ver detalhes de ${product.name}`}
        onClick={handleHeaderClick}
        onKeyDown={handleHeaderKeyDown}
        className="flex items-center gap-3 p-3 cursor-pointer select-none"
      >
        {/* FOTO miniatura — só no estado colapsado */}
        {!isExpanded && (
          <div className="relative shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-cream border border-line">
            {product.image ? (
              <NextImage
                src={product.image}
                alt={product.name}
                fill
                unoptimized
                className="w-full h-full object-cover drop-shadow-[0_4px_12px_rgba(0,0,0,0.12)]"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Cookie className="w-6 h-6 text-kraft" strokeWidth={1.5} />
              </div>
            )}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink truncate">{product.name}</p>
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            <p className="text-xs text-muted">
              {formatBRL(product.price)} / {product.unit}
            </p>
            <CalorieBadge calories={n?.caloriesPerUnit ?? null} variant="inline" />
          </div>

          {n?.tags && n.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {n.tags.slice(0, 3).map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center rounded-md bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent"
                >
                  {TAG_LABELS[t] ?? t}
                </span>
              ))}
            </div>
          )}

          {n && n.allergens.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {n.allergens.map((a) => (
                <span
                  key={a}
                  className="inline-flex items-center rounded-md bg-danger/10 px-2 py-0.5 text-[11px] font-medium text-danger"
                >
                  {ALLERGEN_LABELS[a] ?? a}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 flex items-center gap-2">
          {!isExpanded &&
            (qty === 0 ? (
              <Button
                variant="primary"
                size="sm"
                className="!h-11"
                onClick={handleAdd}
                aria-label={`Adicionar ${product.name} ao carrinho`}
              >
                <Plus className="w-4 h-4" />
              </Button>
            ) : (
              <div className="flex items-center gap-1">
                <Button
                  variant="secondary"
                  size="icon"
                  className="!h-11 !w-11"
                  onClick={handleDec}
                  aria-label={`Diminuir ${product.name}`}
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="w-5 text-center text-xs font-semibold text-ink" aria-label={`Quantidade ${qty}`}>
                  {qty}
                </span>
                <Button
                  variant="primary"
                  size="icon"
                  className="!h-11 !w-11"
                  onClick={handleInc}
                  aria-label={`Aumentar ${product.name}`}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            ))}
          <ChevronDown
            className={`w-4 h-4 text-muted transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Painel expandido inline (sem overlay, sem modal) */}
      {isExpanded && <ProductCardExpandable product={product} qty={qty} onSetQty={onSetQty} onCollapse={onCollapse} />}
    </Card>
  )
}
