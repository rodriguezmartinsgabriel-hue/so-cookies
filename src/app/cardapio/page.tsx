"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { CustomerShell } from "@/components/customer/CustomerShell"
import { ProductCard } from "@/components/customer/ProductCard"
import { useCart } from "@/hooks/useCart"
import { EmptyState } from "@/components/ui/EmptyState"
import { motion } from "framer-motion"
import type { CatalogProduct } from "@/lib/utils"

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
      <div className="space-y-6 cardapio-scroll">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <h1 className="text-2xl font-bold text-ink">Cardápio</h1>
          <p className="text-sm text-muted">Escolha seus cookies — retirada na loja</p>
        </motion.div>

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
          grouped.map(([category, categoryItems], categoryIndex) => (
            <motion.section
              key={category}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: categoryIndex * 0.08, ease: "easeOut" }}
            >
              <motion.h2
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: categoryIndex * 0.08 + 0.05 }}
                className="text-sm font-semibold text-muted uppercase tracking-wide mb-2"
              >
                {category}
              </motion.h2>
              <div className="space-y-2">
                {categoryItems.map((p, itemIndex) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.35,
                      delay: categoryIndex * 0.08 + itemIndex * 0.04,
                      ease: "easeOut",
                    }}
                  >
                    <ProductCard
                      product={p}
                      qty={qtyFor(p.id)}
                      onAdd={() => addItem(p.id)}
                      onSetQty={(q) => setQty(p.id, q)}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.section>
          ))}

        {!loading && !error && products.length === 0 && (
          <EmptyState
            title="Cardápio vazio"
            description="Nenhum produto disponível no momento. Volte mais tarde!"
            action={{ label: "Atualizar", onClick: () => window.location.reload() }}
          />
        )}
      </div>
    </CustomerShell>
  )
}