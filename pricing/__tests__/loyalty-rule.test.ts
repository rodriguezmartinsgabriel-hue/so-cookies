import { describe, it, expect, vi } from "vitest"
import { Decimal } from "@prisma/client/runtime/client"
import type { Product, Coupon, Campaign, ShippingRate, PriceTier } from "@/generated/prisma/client"
import {
  pricingContextFactory,
  productFactory,
  channelConfigFactory,
  mockProductRepository,
  mockCouponRepository,
  mockCampaignRepository,
  mockShippingRepository,
  mockPricingRepository,
  mockLoyaltyRepository,
} from "./factories"
import { buildPricingEngine } from "../factory"
import { LoyaltyRepository } from "../repositories/LoyaltyRepository"

vi.mock("@/generated/prisma/client", () => ({
  PrismaClient: class {},
  Coupon: class {},
  Campaign: class {},
  PriceTier: class {},
  PricingSettings: class {},
  Product: class {},
  Customer: class {},
  ShippingRate: class {},
  LoyaltyAccount: class {},
  LoyaltyTransaction: class {},
  LoyaltyReward: class {},
}))

function createEngineWith(opts: {
  products?: Product[]
  coupons?: Coupon[]
  campaigns?: Campaign[]
  shippingRates?: ShippingRate[]
  priceTiers?: Record<string, PriceTier[]>
  config?: ReturnType<typeof channelConfigFactory>
  loyaltyBalance?: number
  loyaltyDegraded?: boolean
  context?: ReturnType<typeof pricingContextFactory>
  customerId?: string
}) {
  const products = opts.products ?? [productFactory({ price: new Decimal(15) })]
  const coupons = opts.coupons ?? []
  const campaigns = opts.campaigns ?? []
  const shippingRates = opts.shippingRates ?? []
  const config = opts.config ?? channelConfigFactory()
  const priceTiers = opts.priceTiers ?? {}

  const pricingRepo = mockPricingRepository({ config, priceTiers })
  const loyaltyRepo =
    opts.loyaltyDegraded !== undefined
      ? ({
          getBalance: () =>
            Promise.resolve({ data: opts.loyaltyBalance ?? 0, degraded: opts.loyaltyDegraded === true }),
          getSettings: () =>
            Promise.resolve({
              activateLoyalty: true,
              pointsPerReal: 1,
              minOrderTotalForPoints: 0,
              roundingMode: "FLOOR",
            }),
          getAccountMeta: () => Promise.resolve({ data: null, degraded: opts.loyaltyDegraded === true }),
        } as unknown as ReturnType<typeof mockLoyaltyRepository>)
      : mockLoyaltyRepository({ balance: opts.loyaltyBalance ?? 0 })

  const prisma = {} as unknown as Parameters<typeof buildPricingEngine>[0]
  return buildPricingEngine(prisma, {
    logger: { log: () => void 0, error: () => void 0, warn: () => void 0 },
    metrics: { record: () => void 0 },
    register: (registry) => {
      registry.registerRepository("product", mockProductRepository(products))
      registry.registerRepository("coupon", mockCouponRepository(coupons))
      registry.registerRepository("campaign", mockCampaignRepository(campaigns))
      registry.registerRepository("shipping", mockShippingRepository(shippingRates))
      registry.registerRepository("pricing", pricingRepo)
      registry.registerRepository("loyalty", loyaltyRepo)
    },
  })
}

describe("LoyaltyRule (no engine)", () => {
  it("anexa loyaltyPreview no state com pointsToEarn = floor(total) e saldo atual", async () => {
    const engine = createEngineWith({
      products: [productFactory({ price: new Decimal(15) })],
      config: channelConfigFactory({ activateLoyalty: true, pointsPerReal: 1 }),
      loyaltyBalance: 24,
      context: pricingContextFactory({
        items: [{ productId: "prod-1", qty: 5, basePrice: 15, name: "Cookie Clássico" }],
        customerId: "cust-1",
      }),
    })

    const result = await engine.calculatePrice(pricingContextFactory({
      items: [{ productId: "prod-1", qty: 5, basePrice: 15, name: "Cookie Clássico" }],
      customerId: "cust-1",
    }))

    expect(result.state.loyaltyPreview).toBeDefined()
    expect(result.state.loyaltyPreview?.active).toBe(true)
    expect(result.state.loyaltyPreview?.currentBalance).toBe(24)
    expect(result.state.loyaltyPreview?.pointsToEarn).toBe(75)
    expect(result.state.loyaltyPreview?.projectedAfter).toBe(99)
  })

  it("pointsToEarn = 0 quando activateLoyalty=false", async () => {
    const engine = createEngineWith({
      products: [productFactory({ price: new Decimal(15) })],
      config: channelConfigFactory({ activateLoyalty: false, pointsPerReal: 1 }),
      loyaltyBalance: 50,
      context: pricingContextFactory({
        items: [{ productId: "prod-1", qty: 5, basePrice: 15, name: "Cookie" }],
        customerId: "cust-1",
      }),
    })

    const result = await engine.calculatePrice(pricingContextFactory({
      items: [{ productId: "prod-1", qty: 5, basePrice: 15, name: "Cookie" }],
      customerId: "cust-1",
    }))

    expect(result.state.loyaltyPreview?.active).toBe(false)
    expect(result.state.loyaltyPreview?.pointsToEarn).toBe(0)
    expect(result.state.loyaltyPreview?.currentBalance).toBe(50)
  })

  it("não modifica o total do pedido", async () => {
    const engine = createEngineWith({
      products: [productFactory({ price: new Decimal(15) })],
      config: channelConfigFactory({ activateLoyalty: true, pointsPerReal: 1 }),
      loyaltyBalance: 0,
      context: pricingContextFactory({
        items: [{ productId: "prod-1", qty: 5, basePrice: 15, name: "Cookie" }],
        customerId: "cust-1",
      }),
    })

    const result = await engine.calculatePrice(pricingContextFactory({
      items: [{ productId: "prod-1", qty: 5, basePrice: 15, name: "Cookie" }],
      customerId: "cust-1",
    }))

    expect(result.total).toBeCloseTo(75, 2)
    expect(result.summary.discountTotal).toBeCloseTo(0, 2)
    expect(result.summary.subtotal).toBeCloseTo(75, 2)
  })

  it("funciona com customerId ausente (preview padrão com saldo 0)", async () => {
    const engine = createEngineWith({
      products: [productFactory({ price: new Decimal(15) })],
      config: channelConfigFactory({ activateLoyalty: true }),
    })

    const result = await engine.calculatePrice(pricingContextFactory({
      items: [{ productId: "prod-1", qty: 5, basePrice: 15, name: "Cookie" }],
    }))

    expect(result.state.loyaltyPreview?.currentBalance).toBe(0)
    expect(result.state.loyaltyPreview?.pointsToEarn).toBe(75)
  })

  it("suporta múltiplos pontos por real", async () => {
    const engine = createEngineWith({
      products: [productFactory({ price: new Decimal(15) })],
      config: channelConfigFactory({ activateLoyalty: true, pointsPerReal: 2 }),
      loyaltyBalance: 10,
      context: pricingContextFactory({
        items: [{ productId: "prod-1", qty: 5, basePrice: 15, name: "Cookie" }],
        customerId: "cust-1",
      }),
    })

    const result = await engine.calculatePrice(pricingContextFactory({
      items: [{ productId: "prod-1", qty: 5, basePrice: 15, name: "Cookie" }],
      customerId: "cust-1",
    }))

    expect(result.state.loyaltyPreview?.pointsToEarn).toBe(150)
    expect(result.state.loyaltyPreview?.projectedAfter).toBe(160)
  })

  it("marcando loyaltyPreview como degraded quando loyalty está indisponível (ex.: migration pendente)", async () => {
    const engine = createEngineWith({
      products: [productFactory({ price: new Decimal(15) })],
      config: channelConfigFactory({ activateLoyalty: true, pointsPerReal: 1 }),
      loyaltyBalance: 0,
      loyaltyDegraded: true,
      context: pricingContextFactory({
        items: [{ productId: "prod-1", qty: 5, basePrice: 15, name: "Cookie" }],
        customerId: "cust-1",
      }),
    })

    const result = await engine.calculatePrice(pricingContextFactory({
      items: [{ productId: "prod-1", qty: 5, basePrice: 15, name: "Cookie" }],
      customerId: "cust-1",
    }))

    expect(result.state.loyaltyPreview?.active).toBe(false)
    expect(result.state.loyaltyPreview?.degraded).toBe(true)
    expect(result.state.loyaltyPreview?.pointsToEarn).toBe(0)
    expect(result.total).toBeCloseTo(75, 2)
  })
})

describe("LoyaltyRepository.computePoints", () => {
  it("FLOOR arredonda para baixo", () => {
    expect(
      LoyaltyRepository.computePoints(99.9, {
        activateLoyalty: true,
        pointsPerReal: 1,
        minOrderTotalForPoints: 0,
        roundingMode: "FLOOR",
      }),
    ).toBe(99)
  })

  it("CEIL arredonda para cima", () => {
    expect(
      LoyaltyRepository.computePoints(99.1, {
        activateLoyalty: true,
        pointsPerReal: 1,
        minOrderTotalForPoints: 0,
        roundingMode: "CEIL",
      }),
    ).toBe(100)
  })

  it("ROUND arredonda para o mais próximo", () => {
    expect(
      LoyaltyRepository.computePoints(99.5, {
        activateLoyalty: true,
        pointsPerReal: 1,
        minOrderTotalForPoints: 0,
        roundingMode: "ROUND",
      }),
    ).toBe(100)
  })

  it("retorna 0 quando desativado", () => {
    expect(
      LoyaltyRepository.computePoints(100, {
        activateLoyalty: false,
        pointsPerReal: 1,
        minOrderTotalForPoints: 0,
        roundingMode: "FLOOR",
      }),
    ).toBe(0)
  })
})
