"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Plus, Minus, ShoppingBag } from "lucide-react"
import NextImage from "next/image"
import type { CatalogProduct } from "@/lib/utils"
import { formatBRL } from "@/lib/utils"
import { Button } from "@/components/ui/Button"
import { CalorieBadge } from "@/components/ui/CalorieBadge"
import { NutritionFacts } from "@/components/customer/NutritionFacts"
import { useHapticFeedback } from "@/hooks/useHapticFeedback"

type ProductCardExpandableProps = {
  product: CatalogProduct
  qty: number
  onSetQty: (qty: number) => void
  onCollapse: () => void
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

export function ProductCardExpandable({ product, qty, onSetQty, onCollapse }: ProductCardExpandableProps) {
  const haptic = useHapticFeedback()
  const panelRef = useRef<HTMLDivElement>(null)
  const activeElementRef = useRef<HTMLElement | null>(null)
  const [open, setOpen] = useState(false)

  const id = `panel-${product.id}`

  // Abertura animada 100% via CSS (grid-template-rows 0fr -> 1fr), sem JS de animação.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setOpen(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  // Guarda o elemento que tinha foco antes de abrir (para restaurar ao recolher).
  useEffect(() => {
    activeElementRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    panelRef.current?.focus({ preventScroll: true })
    return () => {
      activeElementRef.current?.focus?.()
    }
  }, [])

  const handleCollapse = useCallback(() => {
    haptic.selection()
    onCollapse()
  }, [onCollapse, haptic])

  // Escape recolhe o card expandido.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleCollapse()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [handleCollapse])

  const handleQtyDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (qty <= 0) return
      haptic.tap()
      onSetQty(qty - 1)
    },
    [qty, onSetQty, haptic],
  )

  const handleQtyUp = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      haptic.tap()
      onSetQty(qty + 1)
    },
    [qty, onSetQty, haptic],
  )

  const n = product.nutrition

  return (
    <div
      ref={panelRef}
      id={id}
      role="region"
      aria-label={`Detalhes de ${product.name}`}
      tabIndex={-1}
      className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] focus:outline-none ${
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
      }`}
    >
      <div className="overflow-hidden min-h-0">
        <div className="grid grid-cols-1 md:grid-cols-[14rem_1fr] gap-4 p-3 pt-0">
          {/* FOTO GRANDE */}
          <div className="relative w-full aspect-square md:aspect-[4/3] rounded-xl overflow-hidden bg-cream animate-scale-in">
            {product.image ? (
            <NextImage
              src={product.image}
              alt={product.name}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 224px"
              className="w-full h-full object-cover"
            />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-cream">
                <div className="w-24 h-24 rounded-full bg-ink/5 flex items-center justify-center">
                  <ShoppingBag className="w-10 h-10 text-kraft" strokeWidth={1.5} />
                </div>
              </div>
            )}
          </div>

          {/* CONTEÚDO à direita */}
          <div className="min-w-0 flex flex-col gap-3 animate-fade-in-up">
            <div>
              <h2 className="text-xl font-bold text-ink">{product.name}</h2>
              <p className="text-sm text-muted mt-0.5">
                {formatBRL(product.price)} / {product.unit}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <CalorieBadge calories={n?.caloriesPerUnit ?? null} variant="inline" />
              {n?.tags &&
                n.tags.length > 0 &&
                n.tags.slice(0, 3).map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent"
                  >
                    {TAG_LABELS[t] ?? t}
                  </span>
                ))}
              {n &&
                n.allergens.length > 0 &&
                n.allergens.map((a) => (
                  <span
                    key={a}
                    className="inline-flex items-center rounded-full bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger"
                  >
                    {ALLERGEN_LABELS[a] ?? a}
                  </span>
                ))}
            </div>

            {product.description && (
              <p className="text-sm text-muted leading-relaxed text-pretty">{product.description}</p>
            )}

            <NutritionFacts nutrition={n} />

            {n && n.ingredients.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Ingredientes</p>
                <ul className="text-sm text-ink leading-relaxed space-y-0.5">
                  {n.ingredients.map((i) => (
                    <li key={i.name}>
                      {i.name}
                      {i.brand ? <span className="text-muted"> · {i.brand}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center gap-1 pt-1">
              <Button
                variant="secondary"
                size="icon"
                className="!h-11 !w-11"
                onClick={handleQtyDown}
                aria-label="Diminuir quantidade"
                disabled={qty <= 0}
              >
                <Minus className="w-3 h-3" />
              </Button>
              <span className="w-5 text-center text-xs font-semibold text-ink" aria-label={`Quantidade atual ${qty}`}>
                {qty}
              </span>
              <Button
                variant="primary"
                size="icon"
                className="!h-11 !w-11"
                onClick={handleQtyUp}
                aria-label="Aumentar quantidade"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
