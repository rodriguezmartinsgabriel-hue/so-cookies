import { describe, it, expect, beforeEach, vi } from "vitest"
import { ifoodWebhookSchema, ninentyNineFoodWebhookSchema, MAX_WEBHOOK_BODY_BYTES } from "@/lib/integrations/schemas"

const mocks = vi.hoisted(() => ({
  findIfoodAccountBySignature: vi.fn(),
  find99FoodAccountByMerchant: vi.fn(),
  is99FoodCredentials: vi.fn(),
  processInboundOrderEvent: vi.fn(),
  verifyHmacSha256: vi.fn(),
}))

vi.mock("@/lib/integrations/accounts", () => ({
  findIfoodAccountBySignature: mocks.findIfoodAccountBySignature,
  find99FoodAccountByMerchant: mocks.find99FoodAccountByMerchant,
  is99FoodCredentials: mocks.is99FoodCredentials,
}))

vi.mock("@/lib/integrations/events", () => ({
  processInboundOrderEvent: mocks.processInboundOrderEvent,
}))

vi.mock("@/lib/integrations/signature", () => ({
  verifyHmacSha256: mocks.verifyHmacSha256,
}))

import { POST as ifoodPost } from "@/app/api/integrations/ifood/webhook/route"
import { POST as ninentyNinePost } from "@/app/api/integrations/99food/webhook/route"

const ifoodAccount = {
  id: "acc-1",
  platform: "IFOOD",
  storeName: "Loja",
  enabled: true,
  credentials: { clientId: "c", clientSecret: "s" },
  lastSyncAt: null,
  lastError: null,
}

const ninentyNineAccount = {
  id: "acc-2",
  platform: "99FOOD",
  storeName: "Loja",
  enabled: true,
  credentials: { appId: "a", appShoppId: "shop", clientSecret: "s" },
  lastSyncAt: null,
  lastError: null,
}

const IFOOD_URL = "https://app.cookiesecafes.com/api/integrations/ifood/webhook"
const NINENTYNINE_URL = "https://app.cookiesecafes.com/api/integrations/99food/webhook"

function post(url: string, body: string, headers: Record<string, string> = {}) {
  return new Request(url, { method: "POST", body, headers })
}

describe("webhook routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.processInboundOrderEvent.mockResolvedValue(undefined)
  })

  describe("iFood webhook", () => {
    beforeEach(() => {
      mocks.is99FoodCredentials.mockReturnValue(false)
    })

    it("rejects presence event without valid HMAC signature", async () => {
      mocks.findIfoodAccountBySignature.mockResolvedValue(null)
      const res = await ifoodPost(post(IFOOD_URL, JSON.stringify({ code: "presence" })))
      expect(res.status).toBe(401)
      expect(mocks.processInboundOrderEvent).not.toHaveBeenCalled()
    })

    it("acknowledges signed presence event without processing", async () => {
      mocks.findIfoodAccountBySignature.mockResolvedValue(ifoodAccount)
      const res = await ifoodPost(post(IFOOD_URL, JSON.stringify({ code: "presence" })))
      expect(res.status).toBe(200)
      expect(mocks.processInboundOrderEvent).not.toHaveBeenCalled()
    })

    it("processes a signed order event", async () => {
      mocks.findIfoodAccountBySignature.mockResolvedValue(ifoodAccount)
      const res = await ifoodPost(
        post(IFOOD_URL, JSON.stringify({ id: "evt-1", orderId: "ord-1", code: "order/requests/create" })),
      )
      expect(res.status).toBe(200)
      expect(mocks.processInboundOrderEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          platform: "IFOOD",
          event: expect.objectContaining({ eventId: "evt-1", orderId: "ord-1" }),
        }),
      )
    })

    it("rejects event missing id/orderId", async () => {
      mocks.findIfoodAccountBySignature.mockResolvedValue(ifoodAccount)
      const res = await ifoodPost(post(IFOOD_URL, JSON.stringify({ code: "order/requests/create" })))
      expect(res.status).toBe(400)
    })

    it("rejects invalid JSON", async () => {
      mocks.findIfoodAccountBySignature.mockResolvedValue(ifoodAccount)
      const res = await ifoodPost(post(IFOOD_URL, "{not-json"))
      expect(res.status).toBe(400)
    })

    it("rejects oversized body", async () => {
      mocks.findIfoodAccountBySignature.mockResolvedValue(ifoodAccount)
      const res = await ifoodPost(
        post(IFOOD_URL, "{}", { "content-length": String(MAX_WEBHOOK_BODY_BYTES + 1) }),
      )
      expect(res.status).toBe(413)
    })
  })

  describe("99Food webhook", () => {
    beforeEach(() => {
      mocks.is99FoodCredentials.mockReturnValue(true)
      mocks.verifyHmacSha256.mockReturnValue(true)
      mocks.find99FoodAccountByMerchant.mockResolvedValue(ninentyNineAccount)
    })

    it("processes a signed event", async () => {
      const res = await ninentyNinePost(
        post(
          NINENTYNINE_URL,
          JSON.stringify({ eventId: "evt-1", eventType: "ORDER_CREATED", orderId: "ord-1" }),
          { "x-app-id": "a", "x-app-shopp-id": "shop", "x-app-signature": "sig" },
        ),
      )
      expect(res.status).toBe(200)
      expect(mocks.processInboundOrderEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          platform: "99FOOD",
          event: expect.objectContaining({ eventId: "evt-1", orderId: "ord-1" }),
        }),
      )
    })

    it("rejects payload missing orderId", async () => {
      const res = await ninentyNinePost(
        post(
          NINENTYNINE_URL,
          JSON.stringify({ eventId: "evt-1", eventType: "ORDER_CREATED" }),
          { "x-app-id": "a", "x-app-shopp-id": "shop", "x-app-signature": "sig" },
        ),
      )
      expect(res.status).toBe(400)
    })

    it("rejects oversized body", async () => {
      const res = await ninentyNinePost(
        post(
          NINENTYNINE_URL,
          "{}",
          { "x-app-id": "a", "x-app-shopp-id": "shop", "x-app-signature": "sig", "content-length": String(MAX_WEBHOOK_BODY_BYTES + 1) },
        ),
      )
      expect(res.status).toBe(413)
    })
  })
})

describe("webhook schemas", () => {
  it("ifood: accepts presence event", () => {
    expect(ifoodWebhookSchema.safeParse({ code: "presence" }).success).toBe(true)
  })

  it("ifood: rejects event without id and orderId", () => {
    expect(ifoodWebhookSchema.safeParse({ code: "order/requests/create" }).success).toBe(false)
  })

  it("99food: rejects event missing required fields", () => {
    expect(ninentyNineFoodWebhookSchema.safeParse({ eventId: "1" }).success).toBe(false)
  })

  it("99food: accepts full event", () => {
    expect(
      ninentyNineFoodWebhookSchema.safeParse({ eventId: "1", eventType: "ORDER_CREATED", orderId: "o1", orderURL: "https://x" })
        .success,
    ).toBe(true)
  })
})
