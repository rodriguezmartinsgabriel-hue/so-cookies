import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  runLazyReconcile: vi.fn(),
}))

vi.mock("@/lib/api-auth", () => ({
  requireAuth: mocks.requireAuth,
}))

vi.mock("@/lib/integrations/reconcile", () => ({
  runLazyReconcile: mocks.runLazyReconcile,
}))

import { GET, POST } from "@/app/api/integrations/reconcile/route"

const URL = "https://app.cookiesecafes.com/api/integrations/reconcile"

function req(method: "GET" | "POST", ip: string, cron = false): Request {
  const headers: Record<string, string> = { "x-forwarded-for": ip }
  if (cron) headers["user-agent"] = "Vercel/1.0"
  return new Request(URL, { method, headers })
}

describe("reconcile auth", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAuth.mockResolvedValue({ error: null, session: { user: { id: "u1", role: "OPERACIONAL" } } })
    mocks.runLazyReconcile.mockResolvedValue(undefined)
  })

  afterEach(() => {
    delete process.env.RECONCILE_IP_ALLOWLIST
  })

  it("rejeita caller externo quando allowlist configurada", async () => {
    process.env.RECONCILE_IP_ALLOWLIST = "203.0.113.10, 10.0.0.0/8"
    const res = await POST(req("POST", "198.51.100.5"))
    expect(res.status).toBe(403)
    expect(mocks.runLazyReconcile).not.toHaveBeenCalled()
  })

  it("permite caller allowlistado via POST (sem staff auth)", async () => {
    process.env.RECONCILE_IP_ALLOWLIST = "10.0.0.0/8"
    const res = await POST(req("POST", "10.1.2.3"))
    expect(res.status).toBe(200)
    expect(mocks.requireAuth).not.toHaveBeenCalled()
  })

  it("permite cron (GET + user-agent vercel) via allowlist", async () => {
    process.env.RECONCILE_IP_ALLOWLIST = "10.0.0.0/8"
    const res = await GET(req("GET", "10.1.2.3", true))
    expect(res.status).toBe(200)
    expect(mocks.requireAuth).not.toHaveBeenCalled()
  })

  it("rejeita POST com user-agent vercel (cron usa GET)", async () => {
    process.env.RECONCILE_IP_ALLOWLIST = "10.0.0.0/8"
    const res = await POST(req("POST", "10.1.2.3", true))
    expect(res.status).toBe(405)
    expect(mocks.runLazyReconcile).not.toHaveBeenCalled()
  })

  it("fallback para staff auth quando allowlist está desativada", async () => {
    delete process.env.RECONCILE_IP_ALLOWLIST
    const res = await POST(req("POST", "1.2.3.4"))
    expect(res.status).toBe(200)
    expect(mocks.requireAuth).toHaveBeenCalled()
  })
})
