"use client"

import { useMemo } from "react"
import { usePathname } from "next/navigation"
import { CustomerHeader } from "@/components/customer/CustomerHeader"
import { CustomerTabBar } from "@/components/customer/CustomerTabBar"
import { CustomerTabs } from "@/components/customer/CustomerTabs"
import { CartFloatingBar } from "@/components/customer/CartFloatingBar"
import { MobileAppPrompt } from "@/components/pwa/MobileAppPrompt"
import { useCart } from "@/hooks/useCart"
import { usePricing } from "@/hooks/usePricing"
import { useCatalog } from "@/hooks/customer/queries"

export default function ClienteLayout() {
  const pathname = usePathname()
  const { items, count } = useCart()
  const { data: catalog = [] } = useCatalog()
  const productsById = useMemo(() => {
    const map: Record<string, { category: string }> = {}
    for (const p of catalog) map[p.id] = { category: p.category }
    return map
  }, [catalog])
  const { result: pricingResult } = usePricing({ channel: "pickup", products: productsById })

  const showCartBar = pathname !== "/carrinho"

  const total = useMemo(() => {
    if (pricingResult) return pricingResult.total
    const priceById = new Map<string, number>()
    for (const p of catalog) priceById.set(p.id, p.price)
    return items.reduce((sum, i) => sum + (priceById.get(i.productId) ?? 0) * i.qty, 0)
  }, [pricingResult, items, catalog])

  return (
    <div className="min-h-dvh">
      <CustomerHeader cartCount={count} />

      <main className="max-w-md mx-auto px-4 py-4 pb-[calc(5rem+env(safe-area-inset-bottom))]">
        <CustomerTabs />
      </main>

      {showCartBar && count > 0 && <CartFloatingBar total={total} itemCount={count} />}

      <MobileAppPrompt />

      <CustomerTabBar cartCount={count} />
    </div>
  )
}
