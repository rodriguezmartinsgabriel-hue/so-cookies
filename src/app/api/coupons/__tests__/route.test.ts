import { describe, it, expect, beforeEach, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const prisma = {
    coupon: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: "c1", code: "TESTE" }),
      update: vi.fn().mockResolvedValue({ id: "c1" }),
      delete: vi.fn().mockResolvedValue({}),
    },
  }
  return { requireAuth: vi.fn(), prisma }
})

vi.mock("@/lib/api-auth", () => ({
  requireAuth: mocks.requireAuth,
}))

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}))

import { GET, POST } from "@/app/api/coupons/route"
import { PUT, DELETE } from "@/app/api/coupons/[id]/route"

const URL = "https://app.cookiesecafes.com/api/coupons"

function req(body?: unknown): Request {
  return new Request(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const validBody = {
  code: "bemvindo10",
  name: "Boas-vindas",
  type: "PERCENTAGE",
  value: 10,
}

describe("coupons route RBAC", () => {
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
    expect(mocks.prisma.coupon.findMany).not.toHaveBeenCalled()
  })

  it("GET permite autenticado e lista cupons", async () => {
    mocks.requireAuth.mockResolvedValue({ error: null, session: { user: { id: "u1", role: "OPERACIONAL" } } })
    mocks.prisma.coupon.findMany.mockResolvedValue([{ id: "c1", code: "TESTE" }])
    const res = await GET(new Request(URL))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([{ id: "c1", code: "TESTE" }])
  })

  it("POST exige papel mínimo ADMIN", async () => {
    mocks.requireAuth.mockResolvedValue({
      error: new Response(JSON.stringify({ error: "Sem permissão" }), { status: 403 }),
      session: null,
    })
    const res = await POST(req(validBody))
    expect(res.status).toBe(403)
    expect(mocks.prisma.coupon.create).not.toHaveBeenCalled()
  })

  it("POST rejeita payload inválido com 400", async () => {
    mocks.requireAuth.mockResolvedValue({ error: null, session: { user: { id: "u1", role: "ADMIN" } } })
    const res = await POST(req({ code: "", name: "", value: -5 }))
    expect(res.status).toBe(400)
    expect(mocks.prisma.coupon.create).not.toHaveBeenCalled()
  })

  it("POST permite ADMIN e cria cupom com código normalizado", async () => {
    mocks.requireAuth.mockResolvedValue({ error: null, session: { user: { id: "u1", role: "ADMIN" } } })
    const res = await POST(req(validBody))
    expect(res.status).toBe(201)
    expect(mocks.prisma.coupon.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          code: "BEMVINDO10",
          value: 10,
          usageLimit: 1,
          active: true,
          applicableProducts: [],
          applicableTypes: ["all"],
        }),
      }),
    )
  })

  it("POST retorna 409 quando o código já existe (P2002)", async () => {
    mocks.requireAuth.mockResolvedValue({ error: null, session: { user: { id: "u1", role: "ADMIN" } } })
    mocks.prisma.coupon.create.mockRejectedValue({ code: "P2002" })
    const res = await POST(req(validBody))
    expect(res.status).toBe(409)
  })

  it("PUT exige ADMIN", async () => {
    mocks.requireAuth.mockResolvedValue({
      error: new Response(JSON.stringify({ error: "Sem permissão" }), { status: 403 }),
      session: null,
    })
    const res = await PUT(new Request(URL), { params: Promise.resolve({ id: "c1" }) })
    expect(res.status).toBe(403)
    expect(mocks.prisma.coupon.update).not.toHaveBeenCalled()
  })

  it("PUT permite ADMIN atualizar apenas active", async () => {
    mocks.requireAuth.mockResolvedValue({ error: null, session: { user: { id: "u1", role: "ADMIN" } } })
    const reqPut = new Request(URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: false }),
    })
    const res = await PUT(reqPut, { params: Promise.resolve({ id: "c1" }) })
    expect(res.status).toBe(200)
    expect(mocks.prisma.coupon.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: expect.objectContaining({ active: false }),
    })
  })

  it("DELETE exige ADMIN", async () => {
    mocks.requireAuth.mockResolvedValue({
      error: new Response(JSON.stringify({ error: "Sem permissão" }), { status: 403 }),
      session: null,
    })
    const res = await DELETE(new Request(URL), { params: Promise.resolve({ id: "c1" }) })
    expect(res.status).toBe(403)
  })

  it("DELETE permite ADMIN", async () => {
    mocks.requireAuth.mockResolvedValue({ error: null, session: { user: { id: "u1", role: "ADMIN" } } })
    const res = await DELETE(new Request(URL), { params: Promise.resolve({ id: "c1" }) })
    expect(res.status).toBe(200)
    expect(mocks.prisma.coupon.delete).toHaveBeenCalledWith({ where: { id: "c1" } })
  })
})
