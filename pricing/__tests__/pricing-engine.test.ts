import { describe, it, expect, vi, beforeEach } from "vitest"
import type { PrismaClient } from "@/generated/prisma/client"
import { Decimal } from "@prisma/client/runtime/client"

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
      registry.registerRepository("loyalty", deps.loyaltyRepository)
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
    const coupon = couponFactory({ code: "WELCOME10", type: "PERCENTAGE", value: new Decimal(10) })
    const engine = createEngine({ products: [productFactory()], coupons: [coupon] })
    const result = await engine.calculatePrice(pricingContextFactory({ couponCode: "WELCOME10" }))

    expect(result.summary.discountTotal).toBeCloseTo(7.5, 2)
    expect(result.summary.total).toBeCloseTo(67.5, 2)
    expect(result.state.warnings).toHaveLength(0)
  })

  it("aplica cupom fixo sobre o subtotal", async () => {
    const coupon = couponFactory({ code: "FIX15", type: "FIXED_AMOUNT", value: new Decimal(15) })
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
    const coupon = couponFactory({ code: "MIN50", type: "PERCENTAGE", value: new Decimal(10), minOrderValue: new Decimal(100) })
    const engine = createEngine({ products: [productFactory()], coupons: [coupon] })
    const result = await engine.calculatePrice(pricingContextFactory({ couponCode: "MIN50" }))

    expect(result.summary.discountTotal).toBeCloseTo(0, 2)
    expect(result.state.warnings.length).toBeGreaterThan(0)
  })

  it("cupom de frete grátis zera o frete na entrega", async () => {
    const coupon = couponFactory({ code: "FRETEGRATIS", type: "FREE_SHIPPING", value: new Decimal(0) })
    const engine = createEngine({
      products: [productFactory()],
      coupons: [coupon],
      shippingRates: [shippingRateFactory({ basePrice: new Decimal(10) })],
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
      shippingRates: [shippingRateFactory({ basePrice: new Decimal(10) })],
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
      priceTiers: { "prod-1": [priceTierFactory({ minQty: 5, maxQty: null, price: new Decimal(12) })] },
    })
    const result = await engine.calculatePrice(pricingContextFactory())

    expect(result.state.items[0].priceAfterDiscount).toBeCloseTo(12, 2)
    expect(result.summary.subtotal).toBeCloseTo(60, 2)
    expect(result.summary.discountTotal).toBeCloseTo(15, 2)
    expect(result.summary.total).toBeCloseTo(60, 2)
  })

  it("agrega qty de cookies assados entre sabores para o tier de desconto por volume", async () => {
    // 2 Clássico + 1 Niño = 3 cookies → faixa "Assado 3un" R$13/un.
    // Individualmente, cada sabor (qty 2 ou 1) cairia na faixa 1-2 (R$15),
    // mas o motor deve somar qtys de todos os assados e aplicar R$13 em ambos.
    const classico = productFactory({ id: "ck-classico", sku: "CK-CLASSICO", category: "Assados" })
    const nino = productFactory({ id: "ck-nino", sku: "CK-NINO", category: "Assados" })
    const tiers13 = [
      priceTierFactory({ id: "t1-classico", productId: "ck-classico", name: "Assado 1un", minQty: 1, maxQty: 2, price: new Decimal(15) }),
      priceTierFactory({ id: "t2-classico", productId: "ck-classico", name: "Assado 3un", minQty: 3, maxQty: 9, price: new Decimal(13) }),
      priceTierFactory({ id: "t3-classico", productId: "ck-classico", name: "Assado 10un", minQty: 10, maxQty: null, price: new Decimal(10) }),
    ]
    const tiersNino = [
      priceTierFactory({ id: "t1-nino", productId: "ck-nino", name: "Assado 1un", minQty: 1, maxQty: 2, price: new Decimal(15) }),
      priceTierFactory({ id: "t2-nino", productId: "ck-nino", name: "Assado 3un", minQty: 3, maxQty: 9, price: new Decimal(13) }),
      priceTierFactory({ id: "t3-nino", productId: "ck-nino", name: "Assado 10un", minQty: 10, maxQty: null, price: new Decimal(10) }),
    ]
    const engine = createEngine({
      products: [classico, nino],
      priceTiers: { "ck-classico": tiers13, "ck-nino": tiersNino },
    })
    const result = await engine.calculatePrice(
      pricingContextFactory({
        items: [
          { productId: "ck-classico", qty: 2, basePrice: 15, name: "Cookie Clássico" },
          { productId: "ck-nino", qty: 1, basePrice: 15, name: "Cookie Niño" },
        ],
      }),
    )

    // Ambos itens recebem R$13/unit (faixa 3un obtida pela soma 2+1=3).
    expect(result.state.items[0].priceAfterDiscount).toBeCloseTo(13, 2)
    expect(result.state.items[1].priceAfterDiscount).toBeCloseTo(13, 2)
    // Total: 3 * 13 = 39. Original: 3 * 15 = 45. Desconto: 6.
    expect(result.summary.subtotal).toBeCloseTo(39, 2)
    expect(result.summary.discountTotal).toBeCloseTo(6, 2)
    expect(result.summary.total).toBeCloseTo(39, 2)
    // cookieTiers exposto no estado (lista compartilhada)
    expect(result.state.cookieTiers).toBeDefined()
    expect(result.state.cookieTiers?.length).toBe(3)
  })

  it("não aplica desconto de cookie assado quando a soma das qtys não atinge a próxima faixa", async () => {
    // 1 Clássico + 1 Niño = 2 cookies → faixa 1-2 (R$15, sem desconto).
    const classico = productFactory({ id: "ck-classico", sku: "CK-CLASSICO", category: "Assados" })
    const nino = productFactory({ id: "ck-nino", sku: "CK-NINO", category: "Assados" })
    const engine = createEngine({
      products: [classico, nino],
      priceTiers: {
        "ck-classico": [
          priceTierFactory({ id: "t1c", productId: "ck-classico", name: "Assado 1un", minQty: 1, maxQty: 2, price: new Decimal(15) }),
          priceTierFactory({ id: "t2c", productId: "ck-classico", name: "Assado 3un", minQty: 3, maxQty: 9, price: new Decimal(13) }),
        ],
        "ck-nino": [
          priceTierFactory({ id: "t1n", productId: "ck-nino", name: "Assado 1un", minQty: 1, maxQty: 2, price: new Decimal(15) }),
          priceTierFactory({ id: "t2n", productId: "ck-nino", name: "Assado 3un", minQty: 3, maxQty: 9, price: new Decimal(13) }),
        ],
      },
    })
    const result = await engine.calculatePrice(
      pricingContextFactory({
        items: [
          { productId: "ck-classico", qty: 1, basePrice: 15, name: "Cookie Clássico" },
          { productId: "ck-nino", qty: 1, basePrice: 15, name: "Cookie Niño" },
        ],
      }),
    )

    expect(result.state.items[0].priceAfterDiscount).toBeCloseTo(15, 2)
    expect(result.state.items[1].priceAfterDiscount).toBeCloseTo(15, 2)
    expect(result.summary.discountTotal).toBeCloseTo(0, 2)
    expect(result.summary.total).toBeCloseTo(30, 2)
  })

  it("não aplica faixa de preço quando a flag activatePriceTier está desativada", async () => {
    const engine = createEngine({
      products: [productFactory()],
      priceTiers: { "prod-1": [priceTierFactory({ minQty: 5, maxQty: null, price: new Decimal(12) })] },
      config: channelConfigFactory({ activatePriceTier: false }),
    })
    const result = await engine.calculatePrice(pricingContextFactory())

    expect(result.state.items[0].priceAfterDiscount).toBeCloseTo(15, 2)
    expect(result.summary.discountTotal).toBeCloseTo(0, 2)
    expect(result.summary.total).toBeCloseTo(75, 2)
  })

  it("cupom BUY_X_GET_Y gera warning e não desconta", async () => {
    const coupon = couponFactory({ code: "BUY2GET1", type: "BUY_X_GET_Y", value: new Decimal(1) })
    const engine = createEngine({ products: [productFactory()], coupons: [coupon] })
    const result = await engine.calculatePrice(pricingContextFactory({ couponCode: "BUY2GET1" }))

    expect(result.summary.discountTotal).toBeCloseTo(0, 2)
    expect(result.summary.total).toBeCloseTo(75, 2)
    expect(result.state.warnings.some((w) => w.message.includes("leva/ganha"))).toBe(true)
  })

  it("não aplica cupom quando a flag do canal está desativada", async () => {
    const coupon = couponFactory({ code: "WELCOME10", type: "PERCENTAGE", value: new Decimal(10) })
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
    const coupon = couponFactory({ code: "VINTE", type: "PERCENTAGE", value: new Decimal(20) })
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
