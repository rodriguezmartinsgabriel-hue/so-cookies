"use client"

import { useCart } from './useCart'
import { PricingEngine } from '@so-cookies/pricing'
import { PricingContext, PricingState, PricingResult } from '@so-cookies/pricing'
import { ProductRepository } from '@so-cookies/pricing'
import { CouponRepository } from '@so-cookies/pricing'
import { CampaignRepository } from '@so-cookies/pricing'
import { ShippingRepository } from '@so-cookies/pricing'
import { PricingRepository } from '@so-cookies/pricing'
import { RuleRegistry } from '@so-cookies/pricing'
import { EventBus } from '@so-cookies/pricing'
import { PricingAudit } from '@so-cookies/pricing'
import { PriceTierRule } from '@so-cookies/pricing'
import { formatBRL } from '@so-cookies/pricing'
import { prisma } from '@/lib/prisma'
import { useState, useCallback, useEffect } from 'react'

export function usePricing() {
  const { items, count } = useCart()
  const [pricingResult, setPricingResult] = useState<PricingResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const calculatePrice = useCallback(async (context?: PricingContext) => {
    if (!items.length) {
      setPricingResult({
        state: {
          items: [],
          discounts: [],
          cashbacks: [],
          taxes: [],
          bonuses: [],
          warnings: [],
          logs: [],
          blocked: false
        },
        total: 0,
        summary: {
          subTotal: 0,
          discountsTotal: 0,
          taxesTotal: 0,
          shippingTotal: 0,
          cashbacksTotal: 0,
          bonusesTotal: 0,
          finalTotal: 0,
          itemCount: 0,
          items: []
        },
        auditTrail: []
      })
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Carregar produtos do banco de dados
      const products = await prisma.product.findMany({
        where: {
          id: { in: items.map((i) => i.productId) },
          active: true
        },
        select: {
          id: true,
          name: true,
          price: true,
          cost: true,
          margin: true
        }
      })

      // Mapear produtos
      const productMap: Record<string, any> = {}
      products.forEach(p => productMap[p.id] = p)

      // Inicializar Repositories
      const productRepo = new ProductRepository(prisma)
      const couponRepo = new CouponRepository(prisma)
      const campaignRepo = new CampaignRepository(prisma)
      const shippingRepo = new ShippingRepository(prisma)
      const pricingRepo = new PricingRepository(prisma)

      // Inicializar Registry com as regras
      const registry = new RuleRegistry()
      registry.register('price-tier', new PriceTierRule(productRepo, { log: () => {} }))

      // Inicializar Engine
      const eventBus = new EventBus()
      const audit = new PricingAudit(prisma, eventBus)
      const engine = new PricingEngine(prisma, registry, { log: () => {} }, { record: () => {} })

      // Preparar Contexto
      const context: PricingContext = {
        items: items.map(item => ({
          productId: item.productId,
          qty: item.qty,
          basePrice: productMap[item.productId]?.price || 0,
          name: productMap[item.productId]?.name || ''
        })),
        channel: 'app',
        customerType: 'customer',
        coupon: null,
        shippingMethod: 'delivery',
        shippingAddress: {
          cep: '',
          city: '',
          state: ''
        },
        deliveryDate: null,
        pickupCode: null
      }

      // Calcular Preço
      const result = await engine.calculatePrice(context)
      setPricingResult(result)
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
  }, [items])

  // Calcular quando os itens do carrinho mudam
  useEffect(() => {
    calculatePrice()
  }, [items, calculatePrice])

  return {
    result: pricingResult,
    loading,
    error,
    calculatePrice,
    formatBRL
  }
}