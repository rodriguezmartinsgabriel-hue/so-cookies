import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { db } from "@/lib/db-local"
import { pushPendingChanges, pullChanges } from "@/lib/sync-service"
import { repository, onDataRefresh } from "@/lib/repository"

const iso = "2026-07-31T20:00:00.000Z"

beforeEach(async () => {
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true })
  await Promise.all([db.cashFlow.clear(), db.syncQueue.clear(), db.syncMeta.clear(), db.contacts.clear()])
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("sync pipeline", () => {
  it("merge não sobrescreve edições locais não sincronizadas (regressão bug _synced)", async () => {
    await db.cashFlow.bulkPut([
      { id: "server-1", amount: 10, _synced: true },
      { id: "offline_1", amount: 99, _synced: false },
    ])

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        expect(url).toBe("/api/cashflow")
        return new Response(JSON.stringify([{ id: "server-1", amount: 20 }]), { status: 200 })
      }),
    )

    const refreshed = new Promise<void>((resolve) => onDataRefresh(() => resolve()))
    await repository.cashFlow.getAll()
    await refreshed

    const rows = await db.cashFlow.toArray()
    const server = rows.find((r: any) => r.id === "server-1")
    const offline = rows.find((r: any) => r.id === "offline_1")
    expect(rows).toHaveLength(2)
    expect(server?.amount).toBe(20)
    expect(offline?.amount).toBe(99)
    expect(offline?._synced).toBe(false)
  })

  it("push aplica ack por item: remove só os ok, reconcilia tempId e mantém falhas com contador", async () => {
    await db.syncQueue.bulkAdd([
      { id: 1, action: "create", entity: "cashFlow", data: { type: "ENTRADA", category: "Venda", description: "x", amount: 5 }, tempId: "offline_x", createdAt: iso },
      { id: 2, action: "create", entity: "cashFlow", data: { type: "SAIDA", category: "Compra", description: "y", amount: 3 }, tempId: "offline_y", createdAt: iso },
    ])
    await db.cashFlow.add({ id: "offline_x", amount: 5, _synced: false })

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: any) => {
        expect(url).toBe("/api/sync/push")
        const body = JSON.parse(init.body)
        expect(body.changes).toHaveLength(2)
        return new Response(
          JSON.stringify({
            ok: false,
            processed: [
              { queueId: 1, ok: true, tempId: "offline_x", realId: "real-1" },
              { queueId: 2, ok: false, error: "Erro X" },
            ],
          }),
          { status: 200 },
        )
      }),
    )

    const result = await pushPendingChanges()
    expect(result.pushed).toBe(1)

    const queue = await db.syncQueue.toArray()
    expect(queue).toHaveLength(1)
    expect(queue[0].id).toBe(2)
    expect(queue[0].attempts).toBe(1)

    const rows = await db.cashFlow.toArray()
    const reconciled = rows.find((r: any) => r.id === "real-1")
    expect(reconciled?.amount).toBe(5)
    expect(reconciled?._synced).toBe(true)
    expect(rows.some((r: any) => r.id === "offline_x")).toBe(false)
  })

  it("push descarta poison pill após 5 tentativas", async () => {
    await db.syncQueue.add({ id: 7, action: "update", entity: "cashFlow", data: { id: "server-1", description: "" }, attempts: 4, createdAt: iso })

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(JSON.stringify({ ok: false, processed: [{ queueId: 7, ok: false, error: "Dados inválidos" }] }), { status: 200 })
      }),
    )

    await pushPendingChanges()
    const queue = await db.syncQueue.toArray()
    expect(queue).toHaveLength(0)
  })

  it("pull preserva linhas locais não sincronizadas e carimba as demais", async () => {
    await db.cashFlow.add({ id: "offline_z", amount: 77, _synced: false })

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        expect(url).toBe("/api/sync/pull")
        return new Response(JSON.stringify({ cashFlow: [{ id: "srv-2", amount: 30 }] }), { status: 200 })
      }),
    )

    const result = await pullChanges()
    expect(result.pulled).toBe(1)

    const rows = await db.cashFlow.toArray()
    const server = rows.find((r: any) => r.id === "srv-2")
    const offline = rows.find((r: any) => r.id === "offline_z")
    expect(server?.amount).toBe(30)
    expect(server?._synced).toBe(true)
    expect(offline?.amount).toBe(77)
    expect(offline?._synced).toBe(false)
    expect(rows).toHaveLength(2)
  })
})
