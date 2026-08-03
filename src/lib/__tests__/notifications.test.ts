import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db-local", () => ({
  db: {
    orders: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      below: vi.fn().mockReturnThis(),
      count: vi.fn().mockResolvedValue(0),
      filter: vi.fn().mockResolvedValue([]),
    },
    ingredients: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      below: vi.fn().mockReturnThis(),
      count: vi.fn().mockResolvedValue(0),
      filter: vi.fn().mockResolvedValue([]),
    },
  },
}))

describe("notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("imports without error", async () => {
    const mod = await import("@/lib/notifications")
    expect(mod).toBeDefined()
  })
})
