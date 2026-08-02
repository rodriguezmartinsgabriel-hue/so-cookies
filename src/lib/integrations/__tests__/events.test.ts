import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import type { AccountRecord } from "@/lib/integrations/types"

const mocks = vi.hoisted(() => ({
  inboundFindUnique: vi.fn(),
  inboundCreate: vi.fn(),
  inboundUpdate: vi.fn(),
  fetchNineFoodOrder: vi.fn(),
  fetchIfoodOrder: vi.fn(),
  upsertOrder: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    inboundEvent: {
      findUnique: mocks.inboundFindUnique,
      create: mocks.inboundCreate,
      update: mocks.inboundUpdate,
    },
  },
}))

vi.mock("@/lib/integrations/clients/ninefood", () => ({
  fetchNineFoodOrder: mocks.fetchNineFoodOrder,
}))

vi.mock("@/lib/integrations/clients/ifood", () => ({
  fetchIfoodOrder: mocks.fetchIfoodOrder,
}))

vi.mock("@/lib/integrations/orders", () => ({
  upsertOrder: mocks.upsertOrder,
}))

import { processInboundOrderEvent } from "@/lib/integrations/events"

const account99: AccountRecord = {
  id: "acc-1",
  platform: "99FOOD",
  storeName: "Loja 1",
  enabled: true,
  credentials: { appId: "app", appShoppId: "shop", clientSecret: "secret" },
  lastSyncAt: null,
  lastError: null,
}

const nineFoodDetails = {
  id: "ord-99-1",
  status: "CREATED",
  items: [{ id: "it-1", name: "Cookie", quantity: 2, totalPrice: { value: 20, currency: "BRL" } }],
  totalPrice: { value: 25, currency: "BRL" },
  customer: { name: "Ana" },
}

describe("processInboundOrderEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("rejeita evento duplicado (dedupe por platform+eventId)", async () => {
    mocks.inboundFindUnique.mockResolvedValue({ id: "evt-existing" })
    const result = await processInboundOrderEvent({
      platform: "99FOOD",
      account: account99,
      event: { eventId: "e-1", eventType: "CREATED", orderId: "ord-99-1" },
    })
    expect(result).toEqual({ duplicate: true })
    expect(mocks.inboundCreate).not.toHaveBeenCalled()
  })

  it("reprocessa evento que falhou antes (status ERROR vira RECEIVED)", async () => {
    mocks.inboundFindUnique.mockResolvedValue({ id: "evt-fail", status: "ERROR", error: "API fora" })
    mocks.inboundUpdate.mockImplementation(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => ({ id: where.id, ...data }))
    mocks.fetchNineFoodOrder.mockResolvedValue(nineFoodDetails)
    mocks.upsertOrder.mockResolvedValue({ id: "ord-1" })

    const result = await processInboundOrderEvent({
      platform: "99FOOD",
      account: account99,
      event: { eventId: "e-retry", eventType: "CREATED", orderId: "ord-99-1", orderUrl: "http://x/orders/ord-99-1" },
    })

    expect(result).toEqual({ duplicate: false, internalStatus: "PENDENTE" })
    expect(mocks.inboundUpdate).toHaveBeenCalledWith({
      where: { id: "evt-fail" },
      data: expect.objectContaining({ status: "RECEIVED", error: null }),
    })
    expect(mocks.inboundUpdate).toHaveBeenCalledWith({
      where: { id: "evt-fail" },
      data: expect.objectContaining({ status: "PROCESSED", orderId: "ord-99-1" }),
    })
    expect(mocks.inboundCreate).not.toHaveBeenCalled()
  })

  it("processa evento 99Food novo e marca PROCESSED", async () => {
    mocks.inboundFindUnique.mockResolvedValue(null)
    mocks.inboundCreate.mockResolvedValue({ id: "evt-1" })
    mocks.fetchNineFoodOrder.mockResolvedValue(nineFoodDetails)
    mocks.upsertOrder.mockResolvedValue({ id: "ord-1" })
    mocks.inboundUpdate.mockResolvedValue({ id: "evt-1" })

    const result = await processInboundOrderEvent({
      platform: "99FOOD",
      account: account99,
      event: { eventId: "e-2", eventType: "CREATED", orderId: "ord-99-1", orderUrl: "http://x/orders/ord-99-1" },
    })

    expect(result).toEqual({ duplicate: false, internalStatus: "PENDENTE" })
    expect(mocks.fetchNineFoodOrder).toHaveBeenCalledWith(account99, "http://x/orders/ord-99-1")
    expect(mocks.upsertOrder).toHaveBeenCalledWith(
      expect.objectContaining({ platform: "99FOOD", externalId: "ord-99-1", internalStatus: "PENDENTE" }),
    )
    expect(mocks.inboundUpdate).toHaveBeenCalledWith({
      where: { id: "evt-1" },
      data: expect.objectContaining({ status: "PROCESSED", orderId: "ord-99-1" }),
    })
  })

  it("registra erro no InboundEvent e relança quando o fetch falha", async () => {
    mocks.inboundFindUnique.mockResolvedValue(null)
    mocks.inboundCreate.mockResolvedValue({ id: "evt-3" })
    mocks.fetchNineFoodOrder.mockRejectedValue(new Error("API fora"))

    await expect(
      processInboundOrderEvent({
        platform: "99FOOD",
        account: account99,
        event: { eventId: "e-3", eventType: "CREATED", orderId: "ord-99-3", orderUrl: "http://x/orders/ord-99-3" },
      }),
    ).rejects.toThrow("API fora")

    expect(mocks.inboundUpdate).toHaveBeenCalledWith({
      where: { id: "evt-3" },
      data: expect.objectContaining({ status: "ERROR", error: "API fora" }),
    })
  })
})
