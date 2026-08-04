"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Plus, Minus, ShoppingBag } from "lucide-react"
import NextImage from "next/image"
import type { CatalogProduct } from "@/lib/utils"
import { formatBRL } from "@/lib/utils"
import { Button } from "@/components/ui/Button"
import { CalorieBadge } from "@/components/ui/CalorieBadge"
import { useHapticFeedback } from "@/hooks/useHapticFeedback"

type ProductCardExpandableProps = {
  product: CatalogProduct
  qty: number
  onAdd: () => void
  onSetQty: (qty: number) => void
  onClose: () => void
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

export function ProductCardExpandable({
  product,
  qty,
  onAdd,
  onSetQty,
  onClose,
}: ProductCardExpandableProps) {
  const haptic = useHapticFeedback()
  const overlayRef = useRef<HTMLDivElement>(null)
  const [imageLoaded, setImageLoaded] = useState(false)

  const handleAdd = useCallback(() => {
    haptic.tap()
    onAdd()
  }, [onAdd, haptic])

  const handleQtyDown = useCallback(() => {
    haptic.tap()
    onSetQty(qty - 1)
  }, [qty, onSetQty, haptic])

  const handleQtyUp = useCallback(() => {
    haptic.tap()
    onSetQty(qty + 1)
  }, [qty, onSetQty, haptic])

  const handleClose = useCallback(() => {
    haptic.selection()
    onClose()
  }, [onClose, haptic])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [handleClose])

  const n = product.nutrition

  return (
    <AnimatePresence>
      <motion.div
        ref={overlayRef}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        onClick={handleClose}
        role="dialog"
        aria-modal="true"
        aria-label={product.name}
      >
        <div className="absolute inset-0 bg-ink/40 backdrop-blur-md" />

        <motion.div
          className="relative w-full max-w-md mx-auto bg-paper rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl"
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative">
            <div className="w-full aspect-square bg-cream relative overflow-hidden">
              {product.image ? (
                <>
                  {!imageLoaded && (
                    <div className="absolute inset-0 bg-cream/50 animate-pulse" />
                  )}
                  <NextImage
                    src={product.image}
                    alt={product.name}
                    fill
                    unoptimized
                    className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
                    onLoad={() => setImageLoaded(true)}
                  />
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-cream">
                  <div className="w-24 h-24 rounded-full bg-ink/5 flex items-center justify-center">
                    <ShoppingBag className="w-10 h-10 text-kraft" strokeWidth={1.5} />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleClose}
                aria-label="Fechar"
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-ink/30 backdrop-blur-sm flex items-center justify-center text-paper hover:bg-ink/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-paper via-paper/80 to-transparent" />
          </div>

          <div className="px-5 pb-6 pt-4 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-ink">{product.name}</h2>
              <p className="text-sm text-muted mt-0.5">{formatBRL(product.price)} / {product.unit}</p>
            </div>

            {n?.tags && n.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {n.tags.slice(0, 3).map((t) => (
                  <span key={t} className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
                    {TAG_LABELS[t] ?? t}
                  </span>
                ))}
              </div>
            )}

            {n && n.allergens.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {n.allergens.map((a) => (
                  <span key={a} className="inline-flex items-center rounded-full bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger">
                    {ALLERGEN_LABELS[a] ?? a}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-4 py-2">
              <CalorieBadge calories={n?.caloriesPerUnit ?? null} variant="inline" />
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-line">
              <Button variant="secondary" size="icon" onClick={handleQtyDown} aria-label="Diminuir quantidade">
                <Minus className="w-4 h-4" />
              </Button>
              <span className="w-8 text-center text-lg font-bold text-ink">{qty}</span>
              <Button variant="primary" size="icon" onClick={handleQtyUp} aria-label="Aumentar quantidade">
                <Plus className="w-4 h-4" />
              </Button>
              <Button variant="primary" size="lg" className="flex-1 ml-3" onClick={handleAdd}>
                {qty === 0 ? "Adicionar" : "Adicionar ao carrinho"}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}