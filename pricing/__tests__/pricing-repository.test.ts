import { describe, it, expect, vi } from "vitest"

vi.mock("@/generated/prisma/client", () => ({
  PrismaClient: class {},
  PricingSettings: class {},
  PriceTier: class {},
}))

import { PricingRepository, DEFAULT_CHANNEL_CONFIG } from "../repositories/PricingRepository"

function createFakePrisma(rows: Record<string, unknown> | null) {
  return {
    pricingSettings: {
      findUnique: vi.fn(async () => rows),
      upsert: vi.fn(async ({ create }: { where: { id: string }; create: Record<string, unknown> }) => rows ?? create),
    },
    priceTier: {
      findMany: vi.fn(async () => []),
    },
  }
}

describe("PricingRepository.getChannelConfig", () => {
  it("sem linha PricingSettings não ativa nenhuma promoção por padrão (opt-in)", async () => {
    const prisma = createFakePrisma(null)
    const repo = new PricingRepository(prisma as never)

    const config = await repo.getChannelConfig("pickup")

    expect(config.activatePriceTier).toBe(false)
    expect(config.activateCoupon).toBe(false)
    expect(config.activateCampaign).toBe(false)
    expect(config.activateB2B).toBe(false)
    expect(config.activateFreeShipping).toBe(false)
    expect(config.b2bDiscountPercent).toBe(0)
  })

  it("cria a linha default (upsert) quando não existe", async () => {
    const prisma = createFakePrisma(null)
    const repo = new PricingRepository(prisma as never)

    await repo.getChannelConfig("delivery")

    expect(prisma.pricingSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "default" },
        update: {},
        create: expect.objectContaining({
          id: "default",
          value: expect.objectContaining({ b2bDiscountPercent: 0 }),
        }),
      }),
    )
  })

  it("honra flags explícitas e usa off para chaves ausentes", async () => {
    const prisma = createFakePrisma({
      id: "default",
      value: { activateCoupon: false, activateB2B: true, b2bDiscountPercent: 15 },
    })
    const repo = new PricingRepository(prisma as never)

    const config = await repo.getChannelConfig("delivery")

    expect(config.activateCoupon).toBe(false)
    expect(config.activateB2B).toBe(true)
    expect(config.b2bDiscountPercent).toBe(15)
    expect(config.activatePriceTier).toBe(false)
    expect(config.activateCampaign).toBe(false)
    expect(config.activateFreeShipping).toBe(false)
    expect(prisma.pricingSettings.upsert).not.toHaveBeenCalled()
  })

  it("DEFAULT_CHANNEL_CONFIG é o fallback explícito (nada ativado)", () => {
    expect(DEFAULT_CHANNEL_CONFIG).toEqual({
      id: "default",
      activatePriceTier: false,
      activateCoupon: false,
      activateCampaign: false,
      activateB2B: false,
      activateFreeShipping: false,
      b2bDiscountPercent: 0,
    })
  })
})
