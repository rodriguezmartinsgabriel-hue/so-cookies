"use client"

import { useRef } from "react"
import { Plus, Minus, Cookie, ChevronDown, Flame } from "lucide-react"
import NextImage from "next/image"
import type { CatalogProduct } from "@/lib/utils"
import { formatBRL } from "@/lib/utils"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"

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

function BadgeAllergen({ allergen }: { allergen: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-danger/10 px-2 py-0.5 text-[11px] font-medium text-danger">
      {ALLERGEN_LABELS[allergen] ?? allergen}
    </span>
  )
}

function BadgeTag({ tag }: { tag: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
      {TAG_LABELS[tag] ?? tag}
    </span>
  )
}

function formatGrams(v: number | null): string {
  if (v == null) return "—"
  if (v < 1) return `${Math.round(v * 1000)}mg`
  return `${Math.round(v * 10) / 10}g`
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
      }, 220)
    }
  }

  return (
    <div ref={wrapperRef}>
    <Card
      padded={false}
      className={
        "overflow-hidden transition-all duration-300 ease-[var(--ease-expressive)] " +
        (expanded
          ? "shadow-lg ring-1 ring-accent/20"
          : "hover:-translate-y-0.5 hover:shadow-md")
      }
    >
      {/* Cabeçalho clicável */}
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={expanded}
        aria-controls={`expand-${product.id}`}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        {product.image ? (
          <NextImage
            src={product.image}
            alt={product.name}
            width={48}
            height={48}
            unoptimized
            className={
              "shrink-0 rounded-lg object-cover transition-all duration-300 ease-[var(--ease-expressive)] " +
              (expanded ? "h-24 w-24 rounded-2xl" : "h-12 w-12")
            }
          />
        ) : (
          <div
            className={
              "flex shrink-0 items-center justify-center rounded-lg border border-line bg-cream transition-all duration-300 ease-[var(--ease-expressive)] " +
              (expanded ? "h-24 w-24 rounded-2xl" : "h-12 w-12")
            }
          >
            <Cookie
              className={
                "transition-all duration-300 text-kraft " +
                (expanded ? "w-10 h-10" : "w-5 h-5")
              }
            />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p
            className={
              "font-semibold text-ink transition-colors " +
              (expanded ? "text-base leading-tight line-clamp-2" : "text-sm truncate")
            }
          >
            {product.name}
          </p>
          <p className="text-xs text-muted">
            {formatBRL(product.price)} / {product.unit}
          </p>

          {/* Cartão expandido: badges compactas no cabeçalho */}
          {expanded && n?.tags && n.tags.length > 0 && (
            <div
              className="mt-1.5 flex flex-wrap gap-1 animate-fade-in-up"
              style={{ animationDelay: "60ms" }}
            >
              {n.tags.slice(0, 3).map((t) => (
                <BadgeTag key={t} tag={t} />
              ))}
            </div>
          )}
        </div>

        <ChevronDown
          className={
            "shrink-0 text-muted transition-transform duration-300 ease-[var(--ease-expressive)] " +
            (expanded ? "h-4 w-4 rotate-180" : "h-4 w-4")
          }
        />
      </button>

      {/* Área expansível — animação via grid-rows */}
      <div
        id={`expand-${product.id}`}
        className={
          "grid transition-[grid-template-rows] duration-300 ease-[var(--ease-expressive)] " +
          (expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]")
        }
      >
        <div className="overflow-hidden">
          <div className="border-t border-line/50 px-3 pb-3 pt-3">
            {/* Descrição */}
            {product.description && (
              <p
                className="mb-3 text-xs text-muted animate-fade-in-up"
                style={{ animationDelay: "40ms" }}
              >
                {product.description}
              </p>
            )}

            {/* Macros */}
            {n && n.caloriesPerUnit != null && (
              <div
                className="mb-3 grid grid-cols-4 gap-2 animate-scale-in"
                style={{ animationDelay: "80ms" }}
              >
                <div className="rounded-lg bg-cream px-2 py-1.5 text-center">
                  <div className="flex items-center justify-center gap-0.5 text-[10px] uppercase text-muted">
                    <Flame className="h-3 w-3" /> Cal
                  </div>
                  <p className="text-sm font-semibold text-ink">
                    {Math.round(n.caloriesPerUnit)}
                  </p>
                </div>
                <div className="rounded-lg bg-cream px-2 py-1.5 text-center">
                  <p className="text-[10px] uppercase text-muted">Prot</p>
                  <p className="text-sm font-semibold text-ink">
                    {formatGrams(n.proteinPerUnit)}
                  </p>
                </div>
                <div className="rounded-lg bg-cream px-2 py-1.5 text-center">
                  <p className="text-[10px] uppercase text-muted">Carb</p>
                  <p className="text-sm font-semibold text-ink">
                    {formatGrams(n.carbsPerUnit)}
                  </p>
                </div>
                <div className="rounded-lg bg-cream px-2 py-1.5 text-center">
                  <p className="text-[10px] uppercase text-muted">Gord</p>
                  <p className="text-sm font-semibold text-ink">
                    {formatGrams(n.fatPerUnit)}
                  </p>
                </div>
              </div>
            )}

            {/* Ingredientes */}
            {n && n.ingredients.length > 0 && (
              <div className="mb-3">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Ingredientes
                </p>
                <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
                  {n.ingredients.map((ing, i) => (
                    <li
                      key={ing.name}
                      className="animate-fade-in-up flex items-start gap-1.5 text-xs text-ink"
                      style={{ animationDelay: `${120 + i * 45}ms` }}
                    >
                      <span className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-accent" />
                      <span>
                        {ing.name}
                        {ing.brand ? (
                          <span className="text-muted"> · {ing.brand}</span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Alérgenos */}
            {n && n.allergens.length > 0 && (
              <div
                className="mb-3 animate-slide-in-right"
                style={{ animationDelay: "120ms" }}
              >
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Contém
                </p>
                <div className="flex flex-wrap gap-1">
                  {n.allergens.map((a) => (
                    <BadgeAllergen key={a} allergen={a} />
                  ))}
                </div>
              </div>
            )}

            {/* Info nutricional indisponível */}
            {!n && (
              <p
                className="mb-3 text-xs italic text-muted animate-fade-in-up"
                style={{ animationDelay: "40ms" }}
              >
                Informação nutricional não disponível para este produto.
              </p>
            )}

            {/* Controles de quantidade (no expandido ficam abaixo) */}
            {qty === 0 ? (
              <Button
                variant="primary"
                size="md"
                onClick={(e) => {
                  e.stopPropagation()
                  onAdd()
                }}
                aria-label={`Adicionar ${product.name}`}
                className="w-full animate-fade-in-up"
              >
                <Plus className="h-4 w-4" /> Adicionar ao carrinho
              </Button>
            ) : (
              <div
                className="flex w-full items-center justify-between gap-2 animate-fade-in-up"
                style={{ animationDelay: "160ms" }}
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
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-6 text-center text-sm font-semibold text-ink">
                    {qty}
                  </span>
                  <Button
                    variant="primary"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSetQty(qty + 1)
                    }}
                    aria-label={`Aumentar ${product.name}`}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
    </div>
  )
}
