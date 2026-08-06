import { describe, it, expect, vi, beforeEach } from "vitest"
import type { PrismaClient } from "@/generated/prisma/client"

// Stub dos imports de valor do cliente Prisma gerado (repos são mockados no teste)
vi.mock("@/generated/prisma/client", () => ({
  PrismaClient: class {},
  Coupon: class {},
  Campaign: class {},
  PriceTier: class {},
  PricingSettings: class {},
  Product: class {},
  Customer: class {},
  ShippingRate: class {},
}))

import { buildPricingEngine } from "../factory"
import {
  buildPricingDataLoaderDeps,
  pricingContextFactory,
  productFactory,
  couponFactory,
  campaignFactory,
  shippingRateFactory,
  priceTierFactory,
  channelConfigFactory,
} from "./factories"

function createEngine(opts: Parameters<typeof buildPricingDataLoaderDeps>[0] = {}) {
  const deps = buildPricingDataLoaderDeps(opts)
  const prisma = {} as unknown as PrismaClient

  return buildPricingEngine(prisma, {
    logger: { log: () => void 0, error: () => void 0 },
    metrics: { record: () => void 0 },
    register: (registry) => {
      registry.registerRepository("product", deps.productRepository)
      registry.registerRepository("coupon", deps.couponRepository)
      registry.registerRepository("campaign", deps.campaignRepository)
      registry.registerRepository("shipping", deps.shippingRepository)
      registry.registerRepository("pricing", deps.pricingRepository)
    },
  })
}

describe("PricingEngine v2", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("calcula preço básico sem cupom (pickup)", async () => {
    const engine = createEngine({ products: [productFactory()] })
    const result = await engine.calculatePrice(pricingContextFactory())

    expect(result.total).toBeCloseTo(75, 2)
    expect(result.summary.subtotal).toBeCloseTo(75, 2)
    expect(result.summary.discountTotal).toBeCloseTo(0, 2)
    expect(result.state.warnings).toHaveLength(0)

    for (const timelineEvent of result.auditTrail.timeline) {
      expect(timelineEvent.totalDiscount).toBeCloseTo(0, 2)
      expect(timelineEvent.totalSubtotal).toBeCloseTo(75, 2)
    }
  })

  it("aplica cupom percentual sobre o subtotal", async () => {
    const coupon = couponFactory({ code: "WELCOME10", type: "PERCENTAGE", value: 10 })
    const engine = createEngine({ products: [productFactory()], coupons: [coupon] })
    const result = await engine.calculatePrice(pricingContextFactory({ couponCode: "WELCOME10" }))

    expect(result.summary.discountTotal).toBeCloseTo(7.5, 2)
    expect(result.summary.total).toBeCloseTo(67.5, 2)
    expect(result.state.warnings).toHaveLength(0)
  })

  it("aplica cupom fixo sobre o subtotal", async () => {
    const coupon = couponFactory({ code: "FIX15", type: "FIXED_AMOUNT", value: 15 })
    const engine = createEngine({ products: [productFactory()], coupons: [coupon] })
    const result = await engine.calculatePrice(pricingContextFactory({ couponCode: "FIX15" }))

    expect(result.summary.discountTotal).toBeCloseTo(15, 2)
    expect(result.summary.total).toBeCloseTo(60, 2)
  })

  it("cupom inexistente gera warning e não altera o total", async () => {
    const engine = createEngine({ products: [productFactory()] })
    const result = await engine.calculatePrice(pricingContextFactory({ couponCode: "NOPE" }))

    expect(result.summary.discountTotal).toBeCloseTo(0, 2)
    expect(result.summary.total).toBeCloseTo(75, 2)
    expect(result.state.warnings.some((w) => w.message.includes("NOPE"))).toBe(true)
  })

  it("cupom com pedido mínimo maior que o subtotal gera warning", async () => {
    const coupon = couponFactory({ code: "MIN50", type: "PERCENTAGE", value: 10, minOrderValue: 100 })
    const engine = createEngine({ products: [productFactory()], coupons: [coupon] })
    const result = await engine.calculatePrice(pricingContextFactory({ couponCode: "MIN50" }))

    expect(result.summary.discountTotal).toBeCloseTo(0, 2)
    expect(result.state.warnings.length).toBeGreaterThan(0)
  })

  it("cupom de frete grátis zera o frete na entrega", async () => {
    const coupon = couponFactory({ code: "FRETEGRATIS", type: "FREE_SHIPPING", value: 0 })
    const engine = createEngine({
      products: [productFactory()],
      coupons: [coupon],
      shippingRates: [shippingRateFactory({ basePrice: 10 })],
    })
    const result = await engine.calculatePrice(
      pricingContextFactory({ channel: "delivery", couponCode: "FRETEGRATIS" }),
    )

    expect(result.state.freeShipping).toBe(true)
    expect(result.summary.shippingTotal).toBeCloseTo(0, 2)
    expect(result.summary.total).toBeCloseTo(75, 2)
  })

  it("cobra frete na entrega sem cupom de frete grátis", async () => {
    const engine = createEngine({
      products: [productFactory()],
      shippingRates: [shippingRateFactory({ basePrice: 10 })],
    })
    const result = await engine.calculatePrice(pricingContextFactory({ channel: "delivery" }))

    expect(result.summary.shippingTotal).toBeCloseTo(10, 2)
    expect(result.summary.total).toBeCloseTo(85, 2)
  })

  it("aplica desconto B2B configurado", async () => {
    const engine = createEngine({ products: [productFactory()] })
    const result = await engine.calculatePrice(pricingContextFactory({ customerType: "B2B" }))

    expect(result.summary.discountTotal).toBeCloseTo(7.5, 2)
    expect(result.summary.total).toBeCloseTo(67.5, 2)
  })

  it("não aplica desconto B2B para cliente comum", async () => {
    const engine = createEngine({ products: [productFactory()] })
    const result = await engine.calculatePrice(pricingContextFactory({ customerType: "CLIENTE" }))

    expect(result.summary.discountTotal).toBeCloseTo(0, 2)
  })

  it("aplica campanha ativa (15%)", async () => {
    const engine = createEngine({
      products: [productFactory()],
      campaigns: [campaignFactory()],
    })
    const result = await engine.calculatePrice(pricingContextFactory())

    expect(result.summary.discountTotal).toBeCloseTo(11.25, 2)
    expect(result.summary.total).toBeCloseTo(63.75, 2)
  })

  it("não aplica campanha quando a qtd mínima não é atingida", async () => {
    const campaign = campaignFactory({ conditions: { discountPercent: 15, minQty: 10 } })
    const engine = createEngine({ products: [productFactory()], campaigns: [campaign] })
    const result = await engine.calculatePrice(pricingContextFactory())

    expect(result.summary.discountTotal).toBeCloseTo(0, 2)
    expect(result.summary.total).toBeCloseTo(75, 2)
  })

  it("aplica faixa de preço (tier) no item", async () => {
    const engine = createEngine({
      products: [productFactory()],
      priceTiers: { "prod-1": [priceTierFactory({ minQty: 5, maxQty: null, price: 12 })] },
    })
    const result = await engine.calculatePrice(pricingContextFactory())

    expect(result.state.items[0].priceAfterDiscount).toBeCloseTo(12, 2)
    expect(result.summary.subtotal).toBeCloseTo(60, 2)
    expect(result.summary.discountTotal).toBeCloseTo(15, 2)
    expect(result.summary.total).toBeCloseTo(60, 2)
  })

  it("cupom BUY_X_GET_Y gera warning e não desconta", async () => {
    const coupon = couponFactory({ code: "BUY2GET1", type: "BUY_X_GET_Y", value: 1 })
    const engine = createEngine({ products: [productFactory()], coupons: [coupon] })
    const result = await engine.calculatePrice(pricingContextFactory({ couponCode: "BUY2GET1" }))

    expect(result.summary.discountTotal).toBeCloseTo(0, 2)
    expect(result.summary.total).toBeCloseTo(75, 2)
    expect(result.state.warnings.some((w) => w.message.includes("leva/ganha"))).toBe(true)
  })

  it("não aplica cupom quando a flag do canal está desativada", async () => {
    const coupon = couponFactory({ code: "WELCOME10", type: "PERCENTAGE", value: 10 })
    const engine = createEngine({
      products: [productFactory()],
      coupons: [coupon],
      config: channelConfigFactory({ activateCoupon: false }),
    })
    const result = await engine.calculatePrice(pricingContextFactory({ couponCode: "WELCOME10" }))

    expect(result.summary.discountTotal).toBeCloseTo(0, 2)
    expect(result.summary.total).toBeCloseTo(75, 2)
  })

  it("desconto do cupom reduz o total (regressão do bug de totais)", async () => {
    const coupon = couponFactory({ code: "VINTE", type: "PERCENTAGE", value: 20 })
    const engine = createEngine({ products: [productFactory()], coupons: [coupon] })
    const result = await engine.calculatePrice(pricingContextFactory({ couponCode: "VINTE" }))

    expect(result.summary.discountTotal).toBeCloseTo(15, 2)
    expect(result.summary.total).toBeCloseTo(60, 2)
    expect(result.total).toBe(result.summary.total)

    // Timeline: desconto do cupom atribuído à fase PAYMENT e subtotal acumulado
    const paymentPhase = result.auditTrail.timeline.find((t) => t.phase === "PAYMENT")
    expect(paymentPhase?.totalDiscount).toBeCloseTo(15, 2)
    expect(paymentPhase?.totalSubtotal).toBeCloseTo(60, 2)

    // Subtotal acumulado permanece após todas as fases
    const postProcessing = result.auditTrail.timeline.find((t) => t.phase === "POST_PROCESSING")
    expect(postProcessing?.totalSubtotal).toBeCloseTo(60, 2)
  })
})
