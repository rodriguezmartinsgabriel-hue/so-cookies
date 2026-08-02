import { describe, it, expect, beforeEach } from "vitest"
import { rateLimit, clearRateLimitBuckets } from "@/lib/rate-limit"

function req(ip: string): Request {
  return new Request("http://localhost/api/public/test", { headers: { "x-forwarded-for": ip } })
}

describe("rateLimit", () => {
  beforeEach(() => {
    clearRateLimitBuckets()
  })

  it("allows requests under the limit", () => {
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(req("1.1.1.1"), 5, 60_000).ok).toBe(true)
    }
  })

  it("blocks requests above the limit with retryAfter", () => {
    for (let i = 0; i < 5; i++) rateLimit(req("2.2.2.2"), 5, 60_000)
    const result = rateLimit(req("2.2.2.2"), 5, 60_000)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.retryAfterSeconds).toBeGreaterThan(0)
    }
  })

  it("tracks clients independently", () => {
    for (let i = 0; i < 5; i++) rateLimit(req("3.3.3.3"), 5, 60_000)
    expect(rateLimit(req("4.4.4.4"), 5, 60_000).ok).toBe(true)
  })

  it("resets after the window expires", async () => {
    for (let i = 0; i < 5; i++) rateLimit(req("5.5.5.5"), 5, 50)
    expect(rateLimit(req("5.5.5.5"), 5, 50).ok).toBe(false)
    await new Promise((r) => setTimeout(r, 60))
    expect(rateLimit(req("5.5.5.5"), 5, 50).ok).toBe(true)
  })
})
