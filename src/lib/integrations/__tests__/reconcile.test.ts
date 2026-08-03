import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import type { AccountRecord } from "@/lib/integrations/types"

const mocks = vi.hoisted(() => ({
  accountsFindMany: vi.fn(),
  accountsUpdateMany: vi.fn(),
  accountsUpdate: vi.fn(),
  getAllEnabledAccounts: vi.fn(),
  ordersFindMany: vi.fn(),
  ordersUpdate: vi.fn(),
  fetchNineFoodOrder: vi.fn(),
  fetchIfoodOrder: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    integrationAccount: {
      findMany: mocks.accountsFindMany,
      updateMany: mocks.accountsUpdateMany,
      update: mocks.accountsUpdate,
    },
    order: {
      findMany: mocks.ordersFindMany,
      update: mocks.ordersUpdate,
    },
  },
}))

vi.mock("@/lib/integrations/accounts", () => ({
  getAllEnabledAccounts: mocks.getAllEnabledAccounts,
}))

vi.mock("@/lib/integrations/clients/ninefood", () => ({
  fetchNineFoodOrder: mocks.fetchNineFoodOrder,
}))

vi.mock("@/lib/integrations/clients/ifood", () => ({
  fetchIfoodOrder: mocks.fetchIfoodOrder,
}))

import { runLazyReconcile } from "@/lib/integrations/reconcile"

const account99 = {
  id: "acc-1",
  platform: "99FOOD",
  storeName: null,
  enabled: true,
  credentials: { appId: "a", appShoppId: "s", clientSecret: "x" },
  lastSyncAt: null,
  lastError: null,
}

describe("runLazyReconcile", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("não faz nada sem contas habilitadas", async () => {
    mocks.getAllEnabledAccounts.mockResolvedValue([])
    await runLazyReconcile()
    expect(mocks.accountsUpdateMany).not.toHaveBeenCalled()
  })

  it("reconcilia pedido externo que mudou de status e mantém lastSyncAt", async () => {
    mocks.getAllEnabledAccounts.mockResolvedValue([account99])
    mocks.accountsUpdateMany.mockResolvedValue({ count: 1 })
    mocks.ordersFindMany.mockResolvedValue([
      { id: "ord-1", externalId: "e-1", status: "PENDENTE" },
      { id: "ord-2", externalId: "e-2", status: "CONFIRMADO" },
    ])
    mocks.fetchNineFoodOrder.mockImplementation(async (_acc: AccountRecord, id: string) =>
      id === "e-1" ? { id: "e-1", status: "CONFIRMED" } : { id: "e-2", status: "READY_FOR_PICKUP" },
    )
    mocks.ordersUpdate.mockResolvedValue({})

    await runLazyReconcile()

    expect(mocks.ordersUpdate).toHaveBeenCalledTimes(2)
    expect(mocks.ordersUpdate).toHaveBeenCalledWith({
      where: { id: "ord-1" },
      data: expect.objectContaining({ status: "CONFIRMADO", externalStatus: "CONFIRMED" }),
    })
    expect(mocks.accountsUpdate).not.toHaveBeenCalled()
  })

  it("não reclama conta já processada por outro request (claim falhou)", async () => {
    mocks.getAllEnabledAccounts.mockResolvedValue([account99])
    mocks.accountsUpdateMany.mockResolvedValue({ count: 0 })

    await runLazyReconcile()

    expect(mocks.ordersFindMany).not.toHaveBeenCalled()
    expect(mocks.accountsUpdate).not.toHaveBeenCalled()
  })

  it("registra lastError e libera a trava quando o fetch falha", async () => {
    mocks.getAllEnabledAccounts.mockResolvedValue([account99])
    mocks.accountsUpdateMany.mockResolvedValue({ count: 1 })
    mocks.ordersFindMany.mockResolvedValue([{ id: "ord-1", externalId: "e-1", status: "PENDENTE" }])
    mocks.fetchNineFoodOrder.mockRejectedValue(new Error("API fora"))
    mocks.accountsUpdate.mockResolvedValue({})

    await runLazyReconcile()

    expect(mocks.accountsUpdate).toHaveBeenCalledWith({
      where: { id: "acc-1" },
      data: expect.objectContaining({ lastError: "API fora", lastSyncAt: null }),
    })
  })
})
