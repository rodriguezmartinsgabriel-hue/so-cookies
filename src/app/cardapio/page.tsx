"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Minus, Cookie } from "lucide-react"
import NextImage from "next/image"
import { CustomerShell } from "@/components/customer/CustomerShell"
import { useCart } from "@/hooks/useCart"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"

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
  const router = useRouter()
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const { items, addItem, setQty, count } = useCart()

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
                    <Card
                      key={p.id}
                      padded={false}
                      className="flex items-center gap-3 p-3"
                    >
                      {p.image ? (
                        <NextImage src={p.image} alt={p.name} width={48} height={48} unoptimized className="w-12 h-12 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-cream border border-line flex items-center justify-center shrink-0">
                          <Cookie className="w-5 h-5 text-kraft" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">{p.name}</p>
                        <p className="text-xs text-muted">{formatBRL(p.price)} / {p.unit}</p>
                      </div>
                      {qty === 0 ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => addItem(p.id)}
                          aria-label={`Adicionar ${p.name}`}
                        >
                          <Plus className="w-3.5 h-3.5" /> Adicionar
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="icon"
                            onClick={() => setQty(p.id, qty - 1)}
                            aria-label={`Diminuir ${p.name}`}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="w-6 text-center text-sm font-semibold text-ink">{qty}</span>
                          <Button
                            variant="primary"
                            size="icon"
                            onClick={() => setQty(p.id, qty + 1)}
                            aria-label={`Aumentar ${p.name}`}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </Card>
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
