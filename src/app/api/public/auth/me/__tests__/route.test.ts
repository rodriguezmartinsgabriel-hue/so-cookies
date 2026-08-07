import { describe, it, expect, beforeEach, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireCustomer: vi.fn(),
  customerFindUnique: vi.fn(),
  customerUpdate: vi.fn(),
  rateLimit: vi.fn(),
  syncCustomerToContact: vi.fn(),
  compare: vi.fn(),
  hash: vi.fn(),
}))

vi.mock("@/lib/customer-auth", () => ({
  requireCustomer: mocks.requireCustomer,
  customerSafeSelect: {
    id: true,
    name: true,
    email: true,
    phone: true,
    addressCep: true,
    addressStreet: true,
    addressNumber: true,
    addressComplement: true,
    addressNeighborhood: true,
    addressCity: true,
    addressState: true,
    createdAt: true,
  },
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: {
      findUnique: mocks.customerFindUnique,
      update: mocks.customerUpdate,
    },
  },
}))

vi.mock("bcryptjs", () => ({
  compare: mocks.compare,
  hash: mocks.hash,
}))

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mocks.rateLimit,
}))

vi.mock("@/lib/customer-contact", () => ({
  syncCustomerToContact: mocks.syncCustomerToContact,
}))

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { PATCH } from "@/app/api/public/auth/me/route"

const URL = "https://app.cookiesecafes.com/api/public/auth/me"

function patchReq(body: unknown): Request {
  return new Request(URL, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

const authenticatedCustomer = {
  id: "cust-1",
  name: "Maria",
  email: "maria@email.com",
}

const updatedCustomer = {
  id: "cust-1",
  name: "Maria Silva",
  email: "maria@email.com",
  phone: "11999999999",
  addressCep: "01000-000",
  addressStreet: "Rua Nova",
  addressNumber: "10",
  addressComplement: null,
  addressNeighborhood: "Centro",
  addressCity: "São Paulo",
  addressState: "SP",
  createdAt: new Date(),
}

describe("PATCH /api/public/auth/me", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireCustomer.mockResolvedValue({ error: null, customer: authenticatedCustomer })
    mocks.rateLimit.mockReturnValue({ ok: true, retryAfterSeconds: 0 })
    mocks.customerUpdate.mockResolvedValue(updatedCustomer)
    mocks.syncCustomerToContact.mockResolvedValue({ created: false })
  })

  it("sincroniza contato após atualizar o perfil", async () => {
    const res = await PATCH(
      patchReq({ name: "Maria Silva", phone: "11999999999", addressStreet: "Rua Nova", addressCity: "São Paulo" }),
    )
    expect(res.status).toBe(200)
    expect(mocks.syncCustomerToContact).toHaveBeenCalledWith(updatedCustomer)
  })

  it("retorna 429 quando o rate limit é atingido e não sincroniza", async () => {
    mocks.rateLimit.mockReturnValue({ ok: false, retryAfterSeconds: 30 })
    const res = await PATCH(patchReq({ name: "Maria" }))
    expect(res.status).toBe(429)
    expect(mocks.customerUpdate).not.toHaveBeenCalled()
    expect(mocks.syncCustomerToContact).not.toHaveBeenCalled()
  })

  it("retorna 401 quando não autenticado", async () => {
    mocks.requireCustomer.mockResolvedValue({
      error: new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401 }),
      customer: null,
    })
    const res = await PATCH(patchReq({ name: "Maria" }))
    expect(res.status).toBe(401)
    expect(mocks.customerUpdate).not.toHaveBeenCalled()
  })

  it("rejeita payload inválido com 400", async () => {
    const res = await PATCH(patchReq({ email: "não-é-email" }))
    expect(res.status).toBe(400)
    expect(mocks.customerUpdate).not.toHaveBeenCalled()
    expect(mocks.syncCustomerToContact).not.toHaveBeenCalled()
  })

  it("retorna erro do perfil e NÃO quebra o pedido se a sincronização falhar", async () => {
    mocks.syncCustomerToContact.mockRejectedValue(new Error("db down"))
    const res = await PATCH(patchReq({ name: "Maria Silva" }))
    expect(res.status).toBe(200)
    expect(mocks.customerUpdate).toHaveBeenCalled()
  })
})
