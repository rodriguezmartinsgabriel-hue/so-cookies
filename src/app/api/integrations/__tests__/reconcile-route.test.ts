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

import { POST } from "@/app/api/integrations/reconcile/route"

const URL = "https://app.cookiesecafes.com/api/integrations/reconcile"

function post(ip: string) {
  return new Request(URL, { method: "POST", headers: { "x-forwarded-for": ip } })
}

describe("reconcile IP allowlist", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAuth.mockResolvedValue({ error: null, session: { user: { id: "u1", role: "OPERACIONAL" } } })
    mocks.runLazyReconcile.mockResolvedValue(undefined)
  })

  afterEach(() => {
    delete process.env.RECONCILE_IP_ALLOWLIST
  })

  it("rejects non-allowlisted caller when allowlist is configured", async () => {
    process.env.RECONCILE_IP_ALLOWLIST = "203.0.113.10, 10.0.0.0/8"
    const res = await POST(post("198.51.100.5"))
    expect(res.status).toBe(403)
    expect(mocks.requireAuth).not.toHaveBeenCalled()
  })

  it("accepts allowlisted caller", async () => {
    process.env.RECONCILE_IP_ALLOWLIST = "203.0.113.10, 10.0.0.0/8"
    const res = await POST(post("10.1.2.3"))
    expect(res.status).toBe(200)
    expect(mocks.requireAuth).toHaveBeenCalled()
  })

  it("falls back to staff auth when allowlist is unset", async () => {
    delete process.env.RECONCILE_IP_ALLOWLIST
    const res = await POST(post("1.2.3.4"))
    expect(res.status).toBe(200)
    expect(mocks.requireAuth).toHaveBeenCalled()
  })
})
