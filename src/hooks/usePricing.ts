"use client"

import { useCart } from "./useCart"
import { useState, useEffect, useRef } from "react"

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
    let controller: AbortController | null = null
    const timeout = setTimeout(() => {
      lastCartKeyRef.current = cartKey
      controller = new AbortController()

      if (lastResultRef.current) {
        setPricingResult(lastResultRef.current)
      }
      setLoading(true)
      setError(null)

      async function run() {
        try {
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
            signal: controller!.signal,
          })

          if (!res.ok) {
            const data = await res.json().catch(() => null)
            throw new Error(data?.error || "Failed to calculate price")
          }

          const result = (await res.json()) as PricingResult
          if (!cancelled) {
            lastResultRef.current = result
            setPricingResult(result)
          }
        } catch (err) {
          if (cancelled || controller?.signal.aborted) return
          if (err instanceof Error) setError(err.message)
          else setError("Erro ao calcular preço")
        } finally {
          if (!cancelled) setLoading(false)
        }
      }

      run()
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(timeout)
      controller?.abort()
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
