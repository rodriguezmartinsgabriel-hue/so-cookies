import { describe, it, expect, beforeEach, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const prisma = {
    pricingSettings: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({}),
    },
  }
  return {
    requireAuth: vi.fn(),
    prisma,
    getChannelConfig: vi.fn().mockResolvedValue({
      id: "default",
      activatePriceTier: true,
      activateCoupon: false,
      activateCampaign: false,
      activateB2B: false,
      activateFreeShipping: false,
      b2bDiscountPercent: 0,
      activateLoyalty: true,
      pointsPerReal: 1,
      minOrderTotalForPoints: 0,
      roundingMode: "FLOOR",
    }),
  }
})

vi.mock("@/lib/api-auth", () => ({
  requireAuth: mocks.requireAuth,
}))

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}))

vi.mock("@so-cookies/pricing", () => ({
  PricingRepository: class {
    async getChannelConfig() {
      return mocks.getChannelConfig()
    }
  },
}))

import { GET, PUT } from "@/app/api/pricing-settings/route"

const URL = "https://app.cookiesecafes.com/api/pricing-settings"

function req(body?: unknown): Request {
  return new Request(URL, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

describe("pricing-settings route RBAC", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("GET exige autenticação", async () => {
    mocks.requireAuth.mockResolvedValue({
      error: new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401 }),
      session: null,
    })
    const res = await GET(new Request(URL))
    expect(res.status).toBe(401)
  })

  it("GET retorna a configuração completa para autenticado", async () => {
    mocks.requireAuth.mockResolvedValue({ error: null, session: { user: { id: "u1", role: "OPERACIONAL" } } })
    const res = await GET(new Request(URL))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.activatePriceTier).toBe(true)
  })

  it("PUT exige papel mínimo ADMIN", async () => {
    mocks.requireAuth.mockResolvedValue({
      error: new Response(JSON.stringify({ error: "Sem permissão" }), { status: 403 }),
      session: null,
    })
    const res = await PUT(req({ activatePriceTier: true }))
    expect(res.status).toBe(403)
    expect(mocks.prisma.pricingSettings.upsert).not.toHaveBeenCalled()
  })

  it("PUT rejeita payload inválido com 400", async () => {
    mocks.requireAuth.mockResolvedValue({ error: null, session: { user: { id: "u1", role: "ADMIN" } } })
    const res = await PUT(req({ b2bDiscountPercent: 150 }))
    expect(res.status).toBe(400)
    expect(mocks.prisma.pricingSettings.upsert).not.toHaveBeenCalled()
  })

  it("PUT permite ADMIN e salva configuração mesclada", async () => {
    mocks.requireAuth.mockResolvedValue({ error: null, session: { user: { id: "u1", role: "ADMIN" } } })
    mocks.prisma.pricingSettings.findUnique.mockResolvedValue({
      id: "default",
      value: { activatePriceTier: true },
    })
    const res = await PUT(req({ activateCoupon: true, b2bDiscountPercent: 5 }))
    expect(res.status).toBe(200)
    expect(mocks.prisma.pricingSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          value: expect.objectContaining({ activatePriceTier: true, activateCoupon: true, b2bDiscountPercent: 5 }),
        }),
      }),
    )
  })
})
