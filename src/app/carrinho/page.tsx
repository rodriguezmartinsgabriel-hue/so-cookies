"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Minus, Plus, Trash2, ArrowRight, ShoppingBag, Cookie } from "lucide-react"
import NextImage from "next/image"
import { CustomerShell } from "@/components/customer/CustomerShell"
import { useCart } from "@/hooks/useCart"

type CatalogProduct = {
  id: string
  name: string
  category: string
  price: number
  unit: string
  image: string | null
}

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

export default function CarrinhoPage() {
  const router = useRouter()
  const { items, setQty, removeItem, clear, count } = useCart()
  const [products, setProducts] = useState<Record<string, CatalogProduct>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/public/catalog")
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, CatalogProduct> = {}
        for (const p of data) map[p.id] = p
        setProducts(map)
      })
      .finally(() => setLoading(false))
  }, [])

  const lines = items
    .map((i) => ({ ...i, product: products[i.productId] }))
    .filter((l) => l.product)
  const total = lines.reduce((s, l) => s + l.product.price * l.qty, 0)

  async function handleCheckout() {
    setError("")
    setSubmitting(true)
    try {
      const res = await fetch("/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: lines.map((l) => ({ productId: l.productId, qty: l.qty })) }),
      })
      if (res.status === 401) {
        const next = encodeURIComponent("/carrinho")
        router.push(`/entrar?next=${next}`)
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error || "Não foi possível finalizar o pedido")
        return
      }
      const order = await res.json()
      clear()
      router.push(`/pedido/${order.id}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <CustomerShell cartCount={count}>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Carrinho</h1>
          <p className="text-sm text-muted">Revise seu pedido antes de finalizar</p>
        </div>

        {loading && <div className="text-center py-12 text-muted">Carregando...</div>}

        {!loading && lines.length === 0 && (
          <div className="text-center py-12 border border-dashed border-line rounded-lg">
            <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-muted" />
            <p className="text-muted text-sm">Seu carrinho está vazio</p>
            <button
              onClick={() => router.push("/cardapio")}
              className="mt-3 text-sm px-4 py-2 bg-ink text-paper rounded-lg font-medium hover:bg-ink/90 transition-colors"
            >
              Ver cardápio
            </button>
          </div>
        )}

        {!loading && lines.length > 0 && (
          <>
            <div className="space-y-2">
              {lines.map((l) => (
                <div key={l.productId} className="flex items-center gap-3 border border-line rounded-lg bg-paper p-3 shadow-card">
                  {l.product.image ? (
                    <NextImage src={l.product.image} alt={l.product.name} width={44} height={44} unoptimized className="w-11 h-11 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-11 h-11 rounded-lg bg-cream border border-line flex items-center justify-center shrink-0">
                      <Cookie className="w-5 h-5 text-kraft" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">{l.product.name}</p>
                    <p className="text-xs text-muted">{formatBRL(l.product.price)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQty(l.productId, l.qty - 1)}
                      className="w-8 h-8 flex items-center justify-center border border-line rounded-lg text-ink hover:bg-cream transition-colors"
                      aria-label="Diminuir"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold text-ink">{l.qty}</span>
                    <button
                      onClick={() => setQty(l.productId, l.qty + 1)}
                      className="w-8 h-8 flex items-center justify-center bg-ink text-paper rounded-lg hover:bg-ink/90 transition-colors"
                      aria-label="Aumentar"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeItem(l.productId)}
                      className="w-8 h-8 flex items-center justify-center text-danger hover:bg-danger/10 rounded-lg transition-colors"
                      aria-label="Remover"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-line pt-3">
              <p className="text-sm text-muted">Total</p>
              <p className="text-lg font-bold text-ink">{formatBRL(total)}</p>
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <button
              onClick={handleCheckout}
              disabled={submitting}
              className="w-full h-12 flex items-center justify-center gap-2 bg-ink text-paper font-medium rounded-lg hover:bg-ink/90 active:scale-[0.99] disabled:opacity-50 transition-all"
            >
              {submitting ? "Finalizando..." : "Finalizar pedido — retirada na loja"}
              {!submitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </>
        )}
      </div>
    </CustomerShell>
  )
}
