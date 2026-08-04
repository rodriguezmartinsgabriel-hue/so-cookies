"use client"

import { useRef } from "react"
import { Plus, Minus, Cookie, ChevronDown, Flame } from "lucide-react"
import NextImage from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import type { CatalogProduct } from "@/lib/utils"
import { formatBRL } from "@/lib/utils"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { CalorieBadge } from "@/components/ui/CalorieBadge"

type ProductCardProps = {
  product: CatalogProduct
  qty: number
  expanded: boolean
  onToggle: () => void
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

function BadgeAllergen({ allergen, style }: { allergen: string; style?: React.CSSProperties }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      style={style}
      className="inline-flex items-center rounded-md bg-danger/10 px-2 py-0.5 text-[11px] font-medium text-danger"
    >
      {ALLERGEN_LABELS[allergen] ?? allergen}
    </motion.span>
  )
}

function BadgeTag({ tag, style }: { tag: string; style?: React.CSSProperties }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      style={style}
      className="inline-flex items-center rounded-md bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent"
    >
      {TAG_LABELS[tag] ?? tag}
    </motion.span>
  )
}

function formatGrams(v: number | null): string {
  if (v == null) return "—"
  if (v < 1) return `${Math.round(v * 1000)}mg`
  return `${Math.round(v * 10) / 10}g`
}

const containerVariants = {
  closed: { height: 0, opacity: 0 },
  open: { height: "auto", opacity: 1 },
}

const contentVariants = {
  closed: { opacity: 0, y: 8 },
  open: { opacity: 1, y: 0 },
}

export function ProductCard({
  product,
  qty,
  expanded,
  onToggle,
  onAdd,
  onSetQty,
}: ProductCardProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const n = product.nutrition

  const handleToggle = () => {
    onToggle()
    if (!expanded && wrapperRef.current) {
      setTimeout(() => {
        wrapperRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 250)
    }
  }

  return (
    <div ref={wrapperRef}>
      <Card
        padded={false}
        className={`
          overflow-hidden transition-all duration-300 ease-[var(--ease-expressive)]
          ${expanded ? "shadow-lg ring-1 ring-accent/20" : "hover:-translate-y-0.5 hover:shadow-md"}
        `}
      >
        {/* Cabeçalho clicável */}
        <motion.button
          type="button"
          layout
          onClick={handleToggle}
          aria-expanded={expanded}
          aria-controls={`expand-${product.id}`}
          className="flex w-full items-center gap-3 p-3 text-left"
          whileTap={{ scale: 0.98 }}
          whileHover={{ y: -2 }}
        >
          {/* Imagem com layout animation */}
          <motion.div layout style={{ width: expanded ? 96 : 48, height: expanded ? 96 : 48 }}>
            {product.image ? (
              <NextImage
                fill
                sizes={expanded ? "96px" : "48px"}
                src={product.image}
                alt={product.name}
                className={`
                  object-cover rounded-xl
                  drop-shadow-[0_4px_12px_rgba(0,0,0,0.12)]
                  transition-all duration-300 ease-[var(--ease-expressive)]
                  ${expanded ? "rounded-2xl" : ""}
                `}
              />
            ) : (
              <div
                className={`
                  flex items-center justify-center rounded-xl bg-cream border border-line
                  transition-all duration-300 ease-[var(--ease-expressive)]
                  ${expanded ? "rounded-2xl" : ""}
                `}
              >
                <motion.div
                  layout
                  className={`
                    text-kraft transition-transform
                    ${expanded ? "w-10 h-10" : "w-5 h-5"}
                  `}
                >
                  <Cookie />
                </motion.div>
              </div>
            )}
          </motion.div>

          <div className="min-w-0 flex-1">
            <p
              className={`
                font-semibold text-ink transition-colors
                ${expanded ? "text-base leading-tight line-clamp-2" : "text-sm truncate"}
              `}
            >
              {product.name}
            </p>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <p className="text-xs text-muted">{formatBRL(product.price)} / {product.unit}</p>
              <CalorieBadge calories={n?.caloriesPerUnit ?? null} variant="inline" />
            </div>

            {/* Badges compactas no cabeçalho quando expandido */}
            {expanded && n?.tags && n.tags.length > 0 && (
              <motion.div
                initial="closed"
                animate="open"
                variants={{
                  closed: { opacity: 0, height: 0 },
                  open: { opacity: 1, height: "auto" },
                }}
                className="mt-1.5 flex flex-wrap gap-1"
              >
                {n.tags.slice(0, 3).map((t, i) => (
                  <BadgeTag key={t} tag={t} style={{ transitionDelay: `${60 + i * 45}ms` }} />
                ))}
              </motion.div>
            )}
          </div>

          <motion.div
            layoutId="chevron"
            className="shrink-0 text-muted"
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            <ChevronDown className="h-4 w-4" />
          </motion.div>
        </motion.button>

        {/* Área expansível — AnimatePresence para exit animation */}
        <AnimatePresence mode="wait">
          {expanded && (
            <motion.div
              id={`expand-${product.id}`}
              initial="closed"
              animate="open"
              exit="closed"
              variants={containerVariants}
              transition={{ type: "spring", stiffness: 300, damping: 30, duration: 0.4 }}
              style={{ overflow: "hidden" }}
              className="border-t border-line/50"
            >
              <motion.div
                variants={contentVariants}
                transition={{ delay: 0.05, type: "spring", stiffness: 300, damping: 30 }}
                className="px-3 pb-3 pt-3"
              >
                {/* Descrição */}
                {product.description && (
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08, type: "spring" }}
                    className="mb-3 text-xs text-muted"
                  >
                    {product.description}
                  </motion.p>
                )}

                {/* Macros */}
                {n && n.caloriesPerUnit != null && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, type: "spring" }}
                    className="mb-3 grid grid-cols-4 gap-2"
                  >
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.12, type: "spring" }}
                      className="rounded-lg bg-cream px-2 py-1.5 text-center"
                    >
                      <div className="flex items-center justify-center gap-0.5 text-[10px] uppercase text-muted">
                        <Flame className="h-3 w-3" strokeWidth={2} aria-hidden="true" /> Cal
                      </div>
                      <p className="text-sm font-semibold text-ink">{Math.round(n.caloriesPerUnit)}</p>
                    </motion.div>
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.14, type: "spring" }}
                      className="rounded-lg bg-cream px-2 py-1.5 text-center"
                    >
                      <p className="text-[10px] uppercase text-muted">Prot</p>
                      <p className="text-sm font-semibold text-ink">{formatGrams(n.proteinPerUnit)}</p>
                    </motion.div>
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.16, type: "spring" }}
                      className="rounded-lg bg-cream px-2 py-1.5 text-center"
                    >
                      <p className="text-[10px] uppercase text-muted">Carb</p>
                      <p className="text-sm font-semibold text-ink">{formatGrams(n.carbsPerUnit)}</p>
                    </motion.div>
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.18, type: "spring" }}
                      className="rounded-lg bg-cream px-2 py-1.5 text-center"
                    >
                      <p className="text-[10px] uppercase text-muted">Gord</p>
                      <p className="text-sm font-semibold text-ink">{formatGrams(n.fatPerUnit)}</p>
                    </motion.div>
                  </motion.div>
                )}

                {/* Ingredientes */}
                {n && n.ingredients.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="mb-3"
                  >
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Ingredientes
                    </p>
                    <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
                      {n.ingredients.map((ing, i) => (
                        <motion.li
                          key={ing.name}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.22 + i * 0.045, type: "spring" }}
                          className="flex items-start gap-1.5 text-xs text-ink"
                        >
                          <span className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-accent" />
                          <span>
                            {ing.name}
                            {ing.brand ? (
                              <span className="text-muted"> · {ing.brand}</span>
                            ) : null}
                          </span>
                        </motion.li>
                      ))}
                    </ul>
                  </motion.div>
                )}

                {/* Alérgenos */}
                {n && n.allergens.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="mb-3"
                  >
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Contém
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {n.allergens.map((a, i) => (
                        <BadgeAllergen key={a} allergen={a} style={{ transitionDelay: `${0.22 + i * 0.045}s` }} />
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Info nutricional indisponível */}
                {!n && (
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08, type: "spring" }}
                    className="mb-3 text-xs italic text-muted"
                  >
                    Informação nutricional não disponível para este produto.
                  </motion.p>
                )}

                {/* Controles de quantidade */}
                <AnimatePresence mode="wait">
                  {qty === 0 ? (
                    <motion.button
                      key="add"
                      layout
                      initial={{ opacity: 0, y: 12, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      transition={{ delay: 0.24, type: "spring", stiffness: 400, damping: 30 }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onAdd()
                      }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full inline-flex items-center justify-center gap-2 font-medium rounded-lg bg-ink text-paper hover:bg-ink/90 h-10 px-4 text-sm disabled:opacity-50 disabled:pointer-events-none select-none"
                    >
                      <Plus className="h-4 w-4" /> Adicionar ao carrinho
                    </motion.button>
                  ) : (
                    <motion.div
                      key="counter"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ delay: 0.24, type: "spring", stiffness: 400, damping: 30 }}
                      className="flex w-full items-center justify-between gap-2"
                    >
                      <span className="text-sm text-muted">{qty} no carrinho</span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            onSetQty(qty - 1)
                          }}
                          aria-label={`Diminuir ${product.name}`}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <motion.span
                          layoutId="qty-counter"
                          animate={{ scale: [1, 1.15, 1] }}
                          className="w-6 text-center text-sm font-semibold text-ink"
                        >
                          {qty}
                        </motion.span>
                        <Button
                          variant="primary"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            onSetQty(qty + 1)
                          }}
                          aria-label={`Aumentar ${product.name}`}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  )
}