import { describe, it, expect, beforeEach, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const models = ["order", "sale", "cashFlow", "production", "product", "ingredient", "recipe", "document", "deliveryCost", "contact", "contactInteraction", "priceTier", "syncDelete", "saleChannel"]
  const prisma = Object.fromEntries(models.map((name) => [name, { findMany: vi.fn().mockResolvedValue([]) }]))
  return {
    requireAuth: vi.fn(),
    prisma,
  }
})

vi.mock("@/lib/api-auth", () => ({
  requireAuth: mocks.requireAuth,
}))

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}))

import { POST } from "@/app/api/sync/pull/route"

const URL = "https://app.cookiesecafes.com/api/sync/pull"

function req(): Request {
  return new Request(URL, { method: "POST", body: JSON.stringify({ since: "2026-08-01T00:00:00.000Z" }) })
}

describe("sync pull auth", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("exige papel mínimo OPERACIONAL no requireAuth", async () => {
    mocks.requireAuth.mockResolvedValue({ error: null, session: { user: { id: "u1", role: "OPERACIONAL" } } })
    await POST(req())
    expect(mocks.requireAuth).toHaveBeenCalledWith(expect.any(Request), "OPERACIONAL")
  })

  it("rejeita VISUALIZADOR com 403 (não acessa o banco)", async () => {
    mocks.requireAuth.mockResolvedValue({
      error: new Response(JSON.stringify({ error: "Sem permissão" }), { status: 403 }),
      session: null,
    })
    const res = await POST(req())
    expect(res.status).toBe(403)
    expect(mocks.prisma.order.findMany).not.toHaveBeenCalled()
  })

  it("rejeita não autenticado com 401", async () => {
    mocks.requireAuth.mockResolvedValue({
      error: new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401 }),
      session: null,
    })
    const res = await POST(req())
    expect(res.status).toBe(401)
  })

  it("permite OPERACIONAL e retorna o dump completo", async () => {
    mocks.requireAuth.mockResolvedValue({ error: null, session: { user: { id: "u1", role: "OPERACIONAL" } } })
    mocks.prisma.order.findMany.mockResolvedValue([{ id: "o1" }])
    const res = await POST(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.orders).toEqual([{ id: "o1" }])
    expect(body.channels).toEqual([])
    expect(typeof body.serverTime).toBe("string")
  })
})
