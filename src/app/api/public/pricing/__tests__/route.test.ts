import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  getCustomerSession: vi.fn(),
  productFindMany: vi.fn(),
  engineCalculatePrice: vi.fn(),
}))

vi.mock("@/lib/customer-auth", () => ({
  getCustomerSession: mocks.getCustomerSession,
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: { findMany: mocks.productFindMany },
  },
}))

vi.mock("@so-cookies/pricing", () => ({
  buildPricingEngine: () => ({ calculatePrice: mocks.engineCalculatePrice }),
}))

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { POST } from "../route"

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/public/pricing", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("POST /api/public/pricing — normalização de erros", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCustomerSession.mockResolvedValue({ id: "cust-1", email: "x@x.com" })
    mocks.productFindMany.mockResolvedValue([{ id: "p1", name: "Cookie", price: 15 }])
  })

  it("retorna 401 quando não há sessão", async () => {
    mocks.getCustomerSession.mockResolvedValue(null)
    const res = await POST(makeRequest({ items: [{ productId: "p1", qty: 1 }] }))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe("Não autenticado")
    expect(json.error).not.toMatch(/prisma/i)
  })

  it("retorna 400 com mensagem genérica quando body é inválido (Zod)", async () => {
    const res = await POST(makeRequest({ items: [] }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("Dados inválidos")
    expect(json.details).toBeDefined()
    expect(JSON.stringify(json)).not.toMatch(/prisma/i)
  })

  it("NÃO vaza err.message do Prisma quando o cálculo falha por erro de DB", async () => {
    mocks.engineCalculatePrice.mockRejectedValue(
      new Error("Invalid `prisma.loyaltyAccount.findUnique()` invocation: The table `public.LoyaltyAccount` does not exist in the current database."),
    )

    const res = await POST(makeRequest({ items: [{ productId: "p1", qty: 1 }] }))

    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).not.toMatch(/prisma/i)
    expect(json.error).not.toMatch(/loyaltyAccount/i)
    expect(json.error).not.toMatch(/does not exist/i)
    expect(json.error).toMatch(/Tente novamente/)
  })

  it("retorna 200 com payload completo em caso de sucesso", async () => {
    mocks.engineCalculatePrice.mockResolvedValue({
      total: 15,
      state: { items: [] },
      summary: { total: 15, subtotal: 15, discountTotal: 0 },
    })

    const res = await POST(makeRequest({ items: [{ productId: "p1", qty: 1 }] }))

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.total).toBe(15)
  })
})
