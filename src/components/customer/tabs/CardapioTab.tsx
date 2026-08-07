"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { ArrowUp } from "lucide-react"
import { ProductCard } from "@/components/customer/ProductCard"
import { MenuHero } from "@/components/customer/MenuHero"
import { MenuSkeleton } from "@/components/customer/MenuSkeleton"
import { useCart } from "@/hooks/useCart"
import { usePricing } from "@/hooks/usePricing"
import { EmptyState } from "@/components/ui/EmptyState"
import { useCatalog } from "@/hooks/customer/queries"
import type { CatalogProduct } from "@/lib/utils"

export function CardapioTab() {
  const { data: products = [], isLoading, isError } = useCatalog()
  const [query, setQuery] = useState("")
  const { items, addItem, setQty } = useCart()
  const { result: pricingResult } = usePricing({ channel: "pickup" })
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ref = scrollRef.current
    if (!ref) return
    const handler = () => setShowBackToTop(ref.scrollTop > 400)
    ref.addEventListener("scroll", handler, { passive: true })
    return () => ref.removeEventListener("scroll", handler)
  }, [])

  const grouped = useMemo(() => {
    const map = new Map<string, CatalogProduct[]>()
    for (const p of products) {
      const arr = map.get(p.category) ?? []
      arr.push(p)
      map.set(p.category, arr)
    }
    return [...map.entries()]
  }, [products])

  const queryLower = query.trim().toLowerCase()

  const filtered = useMemo(() => {
    if (!queryLower) return grouped
    return grouped
      .map(
        ([category, categoryItems]) =>
          [
            category,
            categoryItems.filter(
              (p) => p.name.toLowerCase().includes(queryLower) || category.toLowerCase().includes(queryLower),
            ),
          ] as const,
      )
      .filter(([, categoryItems]) => categoryItems.length > 0)
  }, [grouped, queryLower])

  const qtyMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const i of items) map.set(i.productId, i.qty)
    return map
  }, [items])

  const resolvedPriceByProduct = useMemo(() => {
    const map = new Map<string, number>()
    for (const it of pricingResult?.state.items ?? []) {
      if (it.qty > 0) map.set(it.productId, it.priceAfterDiscount)
    }
    return map
  }, [pricingResult])

  const categoryStart = useMemo(() => {
    const start = new Map<string, number>()
    let running = 0
    for (const [category, categoryItems] of filtered) {
      start.set(category, running)
      running += categoryItems.length
    }
    return start
  }, [filtered])

  const filteredCount = useMemo(
    () => filtered.reduce((sum, [, categoryItems]) => sum + categoryItems.length, 0),
    [filtered],
  )

  return (
    <div className="space-y-4 cardapio-scroll" ref={scrollRef}>
      <div className="animate-fade-in-up">
        <MenuHero query={query} onQueryChange={setQuery} resultCount={filteredCount} />
      </div>

      {isLoading && <MenuSkeleton />}
      {isError && <div className="text-center py-12 text-danger">Não foi possível carregar o cardápio</div>}

      {!isLoading &&
        !isError &&
        filtered.map(([category, categoryItems]) => (
          <section key={category}>
            <h2 className="sticky top-[calc(3.5rem+env(safe-area-inset-top,0px))] z-10 -mx-4 mb-2 px-4 py-2">
              <span className="inline-flex items-center rounded-full bg-paper/90 backdrop-blur-sm border border-line/40 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                {category}
                <span className="ml-1.5 text-accent tabular-nums">{categoryItems.length}</span>
              </span>
            </h2>
            <div className="space-y-2 stagger">
              {categoryItems.map((p, itemIndex) => {
                const staggerIndex = Math.min((categoryStart.get(category) ?? 0) + itemIndex, 10)
                return (
                  <div key={p.id} style={{ ["--stagger" as string]: staggerIndex }}>
                    <ProductCard
                      product={p}
                      qty={qtyMap.get(p.id) ?? 0}
                      isExpanded={expandedId === p.id}
                      onExpand={() => setExpandedId(p.id)}
                      onCollapse={() => setExpandedId(null)}
                      onAdd={() => addItem(p.id)}
                      onSetQty={(q) => setQty(p.id, q)}
                      availableTiers={pricingResult?.state.availableTiers?.[p.id]}
                      resolvedUnitPrice={resolvedPriceByProduct.get(p.id)}
                    />
                  </div>
                )
              })}
            </div>
          </section>
        ))}

      {!isLoading && !isError && products.length === 0 && (
        <EmptyState
          title="Cardápio vazio"
          description="Nenhum produto disponível no momento. Volte mais tarde!"
          action={{ label: "Atualizar", onClick: () => window.location.reload() }}
        />
      )}

      {!isLoading && !isError && products.length > 0 && filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-base font-semibold text-ink">Nada encontrado</p>
          <p className="text-sm text-muted mt-1">Não achamos nenhum item para &ldquo;{query.trim()}&rdquo;.</p>
        </div>
      )}

      {showBackToTop && (
        <button
          type="button"
          onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-20 right-4 z-40 w-11 h-11 rounded-full bg-ink text-paper flex items-center justify-center shadow-lg hover:bg-ink/90 transition-colors"
          aria-label="Voltar ao topo"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}
