"use client"

import { useCart } from './useCart'
import { useState, useCallback, useEffect } from 'react'

export function usePricing() {
  const { items: cartItems } = useCart()
  const [pricingResult, setPricingResult] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const calculatePrice = useCallback(async () => {
    if (!cartItems.length) {
      setPricingResult(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/public/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems.map(i => ({
            productId: i.productId,
            qty: i.qty
          })),
          channel: 'pickup'
        })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Failed to calculate price')
      }

      setPricingResult(await res.json())
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Erro ao calcular preço')
        console.error(err)
      }
    } finally {
      setLoading(false)
    }
  }, [cartItems])

  useEffect(() => {
    calculatePrice()
  }, [cartItems, calculatePrice])

  return {
    result: pricingResult,
    loading,
    error,
    calculatePrice,
    formatBRL: (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }
}
