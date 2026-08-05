import { describe, it, expect, beforeEach, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  rateLimit: vi.fn(),
  auth: vi.fn(),
}))

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mocks.rateLimit,
  clearRateLimitBuckets: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({
  auth: mocks.auth,
}))

import { requireAuth } from "@/lib/api-auth"

const URL = "https://app.cookiesecafes.com/api/products"

function req(method: string, headers: Record<string, string> = {}) {
  return new Request(URL, { method, headers })
}

describe("requireAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.rateLimit.mockReturnValue({ ok: true })
    mocks.auth.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } })
  })

  it("returns 429 with Retry-After when rate limited", async () => {
    mocks.rateLimit.mockReturnValue({ ok: false, retryAfterSeconds: 30 })
    const { error } = await requireAuth(req("GET"))
    expect(error?.status).toBe(429)
    expect(error?.headers.get("Retry-After")).toBe("30")
  })

  it("rejects cross-origin unsafe method with 403", async () => {
    const { error } = await requireAuth(req("POST", { origin: "https://evil.example.com" }))
    expect(error?.status).toBe(403)
    expect(mocks.auth).not.toHaveBeenCalled()
  })

  it("accepts unsafe method without Origin header", async () => {
    const { error } = await requireAuth(req("POST"))
    expect(error).toBeNull()
    expect(mocks.auth).toHaveBeenCalled()
  })

  it("does not origin-check safe methods", async () => {
    const { error } = await requireAuth(req("GET", { origin: "https://evil.example.com" }))
    expect(error).toBeNull()
    expect(mocks.auth).toHaveBeenCalled()
  })

  it("returns 401 when unauthenticated", async () => {
    mocks.auth.mockResolvedValue({})
    const { error } = await requireAuth(req("GET"))
    expect(error?.status).toBe(401)
  })
})
