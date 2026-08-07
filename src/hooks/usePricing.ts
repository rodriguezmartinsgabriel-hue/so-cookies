"use client"

import { useCart } from "./useCart"
import { useState, useEffect, useRef } from "react"

export const PRICING_DEBOUNCE_MS = 80

export interface AvailablePriceTier {
  id: string
  productId: string
  name: string
  minQty: number
  maxQty: number | null
  price: number
}

export interface PricingResult {
  state: {
    items: Array<{
      productId: string
      name: string
      qty: number
      basePrice: number
      calculatedPrice: number
      priceAfterDiscount: number
    }>
    blocked: boolean
    blockedReason?: string
    subtotal?: number
    shipping?: { cost: number }
    warnings?: Array<{ message: string; type?: string }>
    freeShipping?: boolean
    availableTiers?: Record<string, AvailablePriceTier[]>
    loyaltyPreview?: {
      active: boolean
      currentBalance: number
      pointsToEarn: number
      projectedAfter: number
      ruleName: string
      degraded?: boolean
    }
  }
  total: number
  summary: {
    originalPrice: number
    subtotal: number
    discountTotal: number
    cashbackTotal: number
    shippingTotal: number
    taxTotal: number
    total: number
    discountPercent: number
    rulesApplied: string[]
    executionTime: number
  }
  auditTrail: unknown
}

export interface UsePricingOptions {
  couponCode?: string | null
  channel?: "delivery" | "pickup" | "digital"
}

// Dedup de requests entre múltiplas instâncias do usePricing (layout, cardápio e
// carrinho ficam montados simultaneamente). Requests com a mesma chave
// (channel|coupon|itens) compartilham uma única Promise em voo.
const pendingPricing = new Map<string, Promise<PricingResult>>()

function fetchPricing(
  cartKey: string,
  channel: string,
  couponCode: string | null,
  cartItems: Array<{ productId: string; qty: number }>,
): Promise<PricingResult> {
  const existing = pendingPricing.get(cartKey)
  if (existing) return existing

  const promise = (async () => {
    const res = await fetch("/api/public/pricing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cartItems.map((i) => ({
          productId: i.productId,
          qty: i.qty,
        })),
        channel,
        couponCode: couponCode || undefined,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      throw new Error(data?.error || "Failed to calculate price")
    }

    return (await res.json()) as PricingResult
  })().finally(() => {
    pendingPricing.delete(cartKey)
  })

  pendingPricing.set(cartKey, promise)
  return promise
}

export function usePricing(options?: UsePricingOptions) {
  const { items: cartItems } = useCart()
  const couponCode = options?.couponCode || null
  const channel = options?.channel ?? "pickup"
  const [pricingResult, setPricingResult] = useState<PricingResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastCartKeyRef = useRef<string>("")
  const lastResultRef = useRef<PricingResult | null>(null)

  useEffect(() => {
    if (!cartItems.length) return

    const cartKey = `${channel}|${couponCode ?? ""}|${cartItems.map((i) => `${i.productId}:${i.qty}`).join("|")}`
    if (cartKey === lastCartKeyRef.current) return

    let cancelled = false
    const timeout = setTimeout(() => {
      lastCartKeyRef.current = cartKey

      // Optimistic preview: enquanto o fetch real não volta, aplicamos os tiers
      // conhecidos localmente (do resultado anterior) ao novo cartKey, para que a
      // UI reaja de forma instantânea à mudança de quantidade.
      const optimistic = buildOptimisticResult(lastResultRef.current, cartItems, channel, couponCode)
      if (optimistic) {
        lastResultRef.current = optimistic
        setPricingResult(optimistic)
      } else if (lastResultRef.current) {
        setPricingResult(lastResultRef.current)
      }
      setLoading(true)
      setError(null)

      async function run() {
        try {
          const result = await fetchPricing(cartKey, channel, couponCode, cartItems)
          if (cancelled) return
          lastResultRef.current = result
          setPricingResult(result)
        } catch (err) {
          if (cancelled) return
          if (err instanceof Error) setError(err.message)
          else setError("Erro ao calcular preço")
        } finally {
          if (!cancelled) setLoading(false)
        }
      }

      run()
    }, PRICING_DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [cartItems, couponCode, channel])

  const isEmpty = cartItems.length === 0
  return {
    result: isEmpty ? null : pricingResult,
    loading: isEmpty ? false : loading,
    error,
    formatBRL: (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
  }
}

/**
 * Constrói um resultado otimista reaproveitando o `availableTiers` do último
 * resultado conhecido. Aplica a faixa correspondente à `qty` de cada item para
 * que a UI mostre o preço com desconto imediatamente, sem esperar o fetch real.
 *
 * Se não houver `availableTiers` ainda (primeira chamada), retorna null e a UI
 * mantém o último estado conhecido sem desconto.
 */
function buildOptimisticResult(
  last: PricingResult | null,
  cartItems: Array<{ productId: string; qty: number }>,
  _channel: string,
  _couponCode: string | null,
): PricingResult | null {
  if (!last) return null
  const tiersByProduct = last.state.availableTiers
  if (!tiersByProduct) return null

  const optimisticItems = cartItems.map((i) => {
    const prev = last.state.items.find((it) => it.productId === i.productId)
    const basePrice = prev?.basePrice ?? 0
    const tiers = tiersByProduct[i.productId] ?? []
    const tier = tiers.find((t) => t.minQty <= i.qty && (t.maxQty === null || t.maxQty >= i.qty))
    const finalUnitPrice = tier ? tier.price : basePrice
    return {
      productId: i.productId,
      name: prev?.name ?? "",
      qty: i.qty,
      basePrice,
      calculatedPrice: finalUnitPrice,
      priceAfterDiscount: finalUnitPrice,
    }
  })

  const subtotal = optimisticItems.reduce((s, it) => s + it.priceAfterDiscount * it.qty, 0)
  const originalPrice = optimisticItems.reduce((s, it) => s + it.basePrice * it.qty, 0)
  const discountTotal = Math.max(0, originalPrice - subtotal)
  const discountPercent = originalPrice > 0 ? (discountTotal / originalPrice) * 100 : 0

  return {
    ...last,
    state: {
      ...last.state,
      items: optimisticItems,
      subtotal,
    },
    total: subtotal + (last.state.shipping?.cost ?? 0),
    summary: {
      ...last.summary,
      originalPrice,
      subtotal,
      discountTotal,
      discountPercent,
      total: subtotal + (last.summary.shippingTotal ?? 0),
    },
  }
}
