// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  integrationGroupBy: vi.fn(),
  orderCount: vi.fn(),
  orderFindFirst: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: mocks.queryRaw,
    integrationAccount: { groupBy: mocks.integrationGroupBy },
    order: {
      count: mocks.orderCount,
      findFirst: mocks.orderFindFirst,
    },
  },
}))

vi.mock("@/lib/payments/config", () => ({
  isMercadoPagoConfigured: () => true,
}))

import { GET } from "@/app/api/health/route"

describe("GET /api/health — checkMercadoPago", () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.queryRaw.mockResolvedValue([{ "?column?": 1 }])
    mocks.integrationGroupBy.mockResolvedValue([])
    mocks.orderCount.mockResolvedValue(0)
    mocks.orderFindFirst.mockResolvedValue(null)
    process.env.MERCADO_PAGO_ACCESS_TOKEN = "APP_USR-teste"
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = "secret"
    process.env.MERCADO_PAGO_NOTIFICATION_URL = "https://loja.com/api/payments/webhook/mercadopago"
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    delete process.env.MERCADO_PAGO_ACCESS_TOKEN
    delete process.env.MERCADO_PAGO_WEBHOOK_SECRET
    delete process.env.MERCADO_PAGO_NOTIFICATION_URL
    vi.unstubAllEnvs()
  })

  it("reporta token inválido ou expirado quando o MP responde 401", async () => {
    vi.stubEnv("NODE_ENV", "production")
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("unauthorized", { status: 401 }))

    const res = await GET()
    const body = await res.json()

    expect(body.checks.mercadopago.status).toBe("error")
    expect(body.checks.mercadopago.detail).toContain("token inválido ou expirado")
    expect(body.checks.mercadopago.detail).toContain("401")
  })

  it("reporta ok quando o token é válido", async () => {
    vi.stubEnv("NODE_ENV", "production")
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }))

    const res = await GET()
    const body = await res.json()

    expect(body.checks.mercadopago.status).toBe("ok")
    expect(body.checks.mercadopago.webhook_secret_configured).toBe(true)
    expect(body.checks.mercadopago.notification_url_configured).toBe(true)
  })

  it("reporta not_configured em produção quando falta webhook secret", async () => {
    vi.stubEnv("NODE_ENV", "production")
    delete process.env.MERCADO_PAGO_WEBHOOK_SECRET

    const res = await GET()
    const body = await res.json()

    expect(body.checks.mercadopago.status).toBe("not_configured")
    expect(body.checks.mercadopago.detail).toContain("MERCADO_PAGO_WEBHOOK_SECRET")
  })
})
