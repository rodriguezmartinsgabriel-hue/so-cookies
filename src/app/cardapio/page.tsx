"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Search, X, ArrowUp } from "lucide-react"
import { CustomerShell } from "@/components/customer/CustomerShell"
import { ProductCard } from "@/components/customer/ProductCard"
import { useCart } from "@/hooks/useCart"
import { usePricing } from "@/hooks/usePricing"
import { EmptyState } from "@/components/ui/EmptyState"
import { Input } from "@/components/ui/Input"
import type { CatalogProduct } from "@/lib/utils"

export default function CardapioPage() {
   const router = useRouter()
   const [products, setProducts] = useState<CatalogProduct[]>([])
   const [loading, setLoading] = useState(true)
   const [error, setError] = useState(false)
   const [query, setQuery] = useState("")
   const { items, addItem, setQty, count } = useCart()
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

  useEffect(() => {
    fetch("/api/public/catalog")
      .then((r) => {
        if (r.status === 401) {
          router.push(`/entrar?next=${encodeURIComponent("/cardapio")}`)
          return null
        }
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((data) => {
        if (data) setProducts(data)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [router])

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
              (p) =>
                p.name.toLowerCase().includes(queryLower) ||
                category.toLowerCase().includes(queryLower),
            ),
          ] as const,
      )
      .filter(([, categoryItems]) => categoryItems.length > 0)
  }, [grouped, queryLower])

  const productMap = useMemo(() => {
    const map: Record<string, CatalogProduct> = {}
    for (const p of products) map[p.id] = p
    return map
  }, [products])

  const cartTotal = useMemo(() => {
    if (pricingResult) return pricingResult.total
    return items.reduce((sum, i) => {
      const product = productMap[i.productId]
      return sum + (product ? product.price * i.qty : 0)
    }, 0)
  }, [items, productMap, pricingResult])

  const qtyMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const i of items) map.set(i.productId, i.qty)
    return map
  }, [items])

  const categoryStart = useMemo(() => {
    const start = new Map<string, number>()
    let running = 0
    for (const [category, categoryItems] of filtered) {
      start.set(category, running)
      running += categoryItems.length
    }
    return start
  }, [filtered])

  const hasSearch = query.trim().length > 0

  return (
    <CustomerShell cartCount={count} cartTotal={cartTotal}>
       <div className="space-y-4 cardapio-scroll" ref={scrollRef}>
        <div className="animate-fade-in-up">
          <h1 className="text-2xl font-bold text-ink">Cardápio</h1>
          <p className="text-sm text-muted">Escolha seus cookies — retirada na loja</p>
        </div>

        <div className="relative animate-fade-in-up">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-kraft pointer-events-none"
            strokeWidth={1.5}
          />
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar no cardápio"
            aria-label="Buscar no cardápio"
            className="!h-11 pl-9 pr-11"
          />
          {hasSearch && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-muted hover:bg-cream transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {loading && (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 w-full bg-cream/50 rounded-xl" />
            ))}
          </div>
        )}
        {error && (
          <div className="text-center py-12 text-danger">Não foi possível carregar o cardápio</div>
        )}

        {!loading &&
          !error &&
          filtered.map(([category, categoryItems]) => (
            <section key={category}>
              <h2 className="sticky top-[calc(3.5rem+env(safe-area-inset-top,0px))] z-10 -mx-4 px-4 py-2 mb-2 bg-paper/90 backdrop-blur-sm border-b border-line/40 text-sm font-semibold text-muted uppercase tracking-wide">
                {category}
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
                       />
                    </div>
                  )
                })}
              </div>
            </section>
          ))}

        {!loading && !error && products.length === 0 && (
          <EmptyState
            title="Cardápio vazio"
            description="Nenhum produto disponível no momento. Volte mais tarde!"
            action={{ label: "Atualizar", onClick: () => window.location.reload() }}
          />
        )}

        {!loading && !error && products.length > 0 && filtered.length === 0 && (
           <div className="text-center py-12">
             <p className="text-base font-semibold text-ink">Nada encontrado</p>
             <p className="text-sm text-muted mt-1">
               Não achamos nenhum item para &ldquo;{query.trim()}&rdquo;.
             </p>
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
     </CustomerShell>
  )
}