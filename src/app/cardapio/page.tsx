"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, Minus } from "lucide-react"
import { CustomerShell } from "@/components/customer/CustomerShell"
import { useCart } from "@/hooks/useCart"

type CatalogProduct = {
  id: string
  name: string
  category: string
  price: number
  unit: string
  image: string | null
  description?: string | null
}

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

export default function CardapioPage() {
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const { items, addItem, setQty, count } = useCart()

  useEffect(() => {
    fetch("/api/public/catalog")
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((data) => setProducts(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
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

  const qtyFor = (id: string) => items.find((i) => i.productId === id)?.qty ?? 0

  return (
    <CustomerShell cartCount={count}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">Cardápio</h1>
          <p className="text-sm text-muted">Escolha seus cookies — retirada na loja</p>
        </div>

        {loading && (
          <div className="text-center py-12 text-muted">Carregando cardápio...</div>
        )}
        {error && (
          <div className="text-center py-12 text-danger">Não foi possível carregar o cardápio</div>
        )}

        {!loading &&
          !error &&
          grouped.map(([category, items]) => (
            <section key={category}>
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">
                {category}
              </h2>
              <div className="space-y-2">
                {items.map((p) => {
                  const qty = qtyFor(p.id)
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 border border-line rounded-lg bg-paper p-3 shadow-card"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">{p.name}</p>
                        <p className="text-xs text-muted">{formatBRL(p.price)} / {p.unit}</p>
                      </div>
                      {qty === 0 ? (
                        <button
                          onClick={() => addItem(p.id)}
                          className="flex items-center gap-1 text-xs px-3 py-2 bg-ink text-paper rounded-lg font-medium hover:bg-ink/90 active:scale-95 transition-colors"
                          aria-label={`Adicionar ${p.name}`}
                        >
                          <Plus className="w-3.5 h-3.5" /> Adicionar
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setQty(p.id, qty - 1)}
                            className="w-8 h-8 flex items-center justify-center border border-line rounded-lg text-ink hover:bg-cream transition-colors"
                            aria-label={`Diminuir ${p.name}`}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-6 text-center text-sm font-semibold text-ink">{qty}</span>
                          <button
                            onClick={() => setQty(p.id, qty + 1)}
                            className="w-8 h-8 flex items-center justify-center bg-ink text-paper rounded-lg hover:bg-ink/90 transition-colors"
                            aria-label={`Aumentar ${p.name}`}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}

        {!loading && !error && products.length === 0 && (
          <div className="text-center py-12 text-muted">Cardápio vazio por enquanto</div>
        )}
      </div>
    </CustomerShell>
  )
}
