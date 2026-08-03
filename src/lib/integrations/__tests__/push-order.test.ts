import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  orderFindUnique: vi.fn(),
  orderUpdate: vi.fn(),
  getEnabledAccounts: vi.fn(),
  updateNineFoodOrderStatus: vi.fn(),
  updateIfoodOrderStatus: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: {
      findUnique: mocks.orderFindUnique,
      update: mocks.orderUpdate,
    },
  },
}))

vi.mock("@/lib/integrations/accounts", () => ({
  getEnabledAccounts: mocks.getEnabledAccounts,
}))

vi.mock("@/lib/integrations/clients/ninefood", () => ({
  updateNineFoodOrderStatus: mocks.updateNineFoodOrderStatus,
  fetchNineFoodOrder: vi.fn(),
}))

vi.mock("@/lib/integrations/clients/ifood", () => ({
  updateIfoodOrderStatus: mocks.updateIfoodOrderStatus,
  fetchIfoodOrder: vi.fn(),
}))

import { pushOrderStatusToPlatform } from "@/lib/integrations/push"

describe("pushOrderStatusToPlatform", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("não empurra pedido interno (sem plataforma)", async () => {
    mocks.orderFindUnique.mockResolvedValue({ id: "ord", platform: null, externalId: null, status: "CONFIRMADO" })
    const result = await pushOrderStatusToPlatform("ord")
    expect(result).toEqual({ pushed: false, reason: "sem-plataforma" })
    expect(mocks.updateNineFoodOrderStatus).not.toHaveBeenCalled()
  })

  it("não empurra sem conta integrada", async () => {
    mocks.orderFindUnique.mockResolvedValue({ id: "ord", platform: "99FOOD", externalId: "e-1", status: "CONFIRMADO" })
    mocks.getEnabledAccounts.mockResolvedValue([])
    const result = await pushOrderStatusToPlatform("ord")
    expect(result).toEqual({ pushed: false, reason: "sem-conta" })
  })

  it("confirma pedido 99Food e grava externalStatus", async () => {
    mocks.orderFindUnique.mockResolvedValue({ id: "ord", platform: "99FOOD", externalId: "e-1", status: "CONFIRMADO" })
    mocks.getEnabledAccounts.mockResolvedValue([
      { id: "acc", platform: "99FOOD", storeName: null, enabled: true, credentials: { appId: "a", appShoppId: "s", clientSecret: "x" }, lastSyncAt: null, lastError: null },
    ])
    mocks.updateNineFoodOrderStatus.mockResolvedValue(undefined)
    mocks.orderUpdate.mockResolvedValue({})

    const result = await pushOrderStatusToPlatform("ord")
    expect(result).toEqual({ pushed: true, operation: "confirm" })
    expect(mocks.updateNineFoodOrderStatus).toHaveBeenCalledWith(expect.anything(), "e-1", "confirm")
    expect(mocks.orderUpdate).toHaveBeenCalledWith({
      where: { id: "ord" },
      data: expect.objectContaining({ externalStatus: "CONFIRMED" }),
    })
  })

  it("empurra via cliente iFood quando plataforma é IFOOD", async () => {
    mocks.orderFindUnique.mockResolvedValue({ id: "ord", platform: "IFOOD", externalId: "e-2", status: "ENTREGA" })
    mocks.getEnabledAccounts.mockResolvedValue([
      { id: "acc", platform: "IFOOD", storeName: null, enabled: true, credentials: { clientId: "c", clientSecret: "s" }, lastSyncAt: null, lastError: null },
    ])
    mocks.updateIfoodOrderStatus.mockResolvedValue(undefined)
    mocks.orderUpdate.mockResolvedValue({})

    const result = await pushOrderStatusToPlatform("ord")
    expect(result).toEqual({ pushed: true, operation: "dispatch" })
    expect(mocks.updateIfoodOrderStatus).toHaveBeenCalledWith(expect.anything(), "e-2", "dispatch")
    expect(mocks.orderUpdate).toHaveBeenCalledWith({
      where: { id: "ord" },
      data: expect.objectContaining({ externalStatus: "DISPATCHED" }),
    })
  })
})
