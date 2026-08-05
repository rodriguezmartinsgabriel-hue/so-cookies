import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { db } from "@/lib/db-local"
import { pushPendingChanges, pullChanges } from "@/lib/sync-service"
import { repository, onDataRefresh } from "@/lib/repository"
import { addSyncError, getLastSyncTime } from "@/lib/db-local"
import { MAX_PUSH_BODY } from "@/lib/files"

const iso = "2026-07-31T20:00:00.000Z"

beforeEach(async () => {
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true })
  await Promise.all([db.cashFlow.clear(), db.syncQueue.clear(), db.syncMeta.clear(), db.contacts.clear(), db.ingredients.clear(), db.documents.clear(), db.syncErrors.clear(), db.products.clear(), db.priceTiers.clear(), db.productions.clear(), db.recipes.clear(), db.recipeItems.clear()])
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("sync pipeline", () => {
  it("merge não sobrescreve edições locais não sincronizadas (regressão bug _synced)", async () => {
    await db.cashFlow.bulkPut([
      { id: "server-1", type: "ENTRADA", category: "Venda", description: "x", amount: 10, date: iso, _synced: true, _updatedAt: iso },
      { id: "offline_1", type: "ENTRADA", category: "Venda", description: "x", amount: 99, date: iso, _synced: false, _updatedAt: iso },
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
    const server = rows.find((r) => r.id === "server-1")
    const offline = rows.find((r) => r.id === "offline_1")
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
    await db.cashFlow.add({ id: "offline_x", type: "ENTRADA", category: "Venda", description: "x", amount: 5, date: iso, _synced: false, _updatedAt: iso })

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        expect(url).toBe("/api/sync/push")
        const body = JSON.parse(String(init.body))
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
    const reconciled = rows.find((r) => r.id === "real-1")
    expect(reconciled?.amount).toBe(5)
    expect(reconciled?._synced).toBe(true)
    expect(rows.some((r) => r.id === "offline_x")).toBe(false)
  })

  it("push mantém item falho na fila (não descarta) e aplica backoff", async () => {
    await db.syncQueue.add({ id: 7, action: "update", entity: "cashFlow", data: { id: "server-1", description: "" }, attempts: 4, lastAttemptAt: "2020-01-01T00:00:00.000Z", createdAt: iso })

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(JSON.stringify({ ok: false, processed: [{ queueId: 7, ok: false, error: "Dados inválidos" }] }), { status: 200 })
      }),
    )

    await pushPendingChanges()
    const queue = await db.syncQueue.toArray()
    expect(queue).toHaveLength(1)
    expect(queue[0].attempts).toBe(5)
    expect(queue[0].lastAttemptAt).toBeDefined()
  })

  it("push respeita backoff: não envia item com última tentativa recente", async () => {
    const recent = new Date(Date.now() - 2000).toISOString()
    await db.syncQueue.add({ id: 8, action: "update", entity: "cashFlow", data: { id: "server-1", description: "" }, attempts: 3, lastAttemptAt: recent, createdAt: iso })

    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: false, processed: [] }), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    const result = await pushPendingChanges()
    expect(result.pushed).toBe(0)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("push limpa syncErrors do item após sucesso", async () => {
    await db.syncQueue.add({ id: 30, action: "update", entity: "cashFlow", data: { id: "server-1", description: "" }, createdAt: iso })
    await db.syncErrors.add({ entity: "cashFlow", action: "update", error: "Erro antigo", dropped: false, createdAt: iso, itemKey: "cashFlow:server-1" })

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(JSON.stringify({ ok: false, processed: [{ queueId: 30, ok: true }] }), { status: 200 })
      }),
    )

    await pushPendingChanges()

    const errs = await db.syncErrors.toArray()
    expect(errs).toHaveLength(0)

    const queue = await db.syncQueue.toArray()
    expect(queue).toHaveLength(0)
  })

  it("addSyncError deduplica erros do mesmo item (itemKey)", async () => {
    await addSyncError({ entity: "cashFlow", action: "update", error: "Erro A", itemKey: "cashFlow:server-1" })
    await addSyncError({ entity: "cashFlow", action: "update", error: "Erro B", itemKey: "cashFlow:server-1" })

    const errs = await db.syncErrors.toArray()
    expect(errs).toHaveLength(1)
    expect(errs[0].error).toBe("Erro B")
  })

  it("pull preserva linhas locais não sincronizadas e carimba as demais", async () => {
    await db.cashFlow.add({ id: "offline_z", type: "ENTRADA", category: "Venda", description: "x", amount: 77, date: iso, _synced: false, _updatedAt: iso })

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
    const server = rows.find((r) => r.id === "srv-2")
    const offline = rows.find((r) => r.id === "offline_z")
    expect(server?.amount).toBe(30)
    expect(server?._synced).toBe(true)
    expect(offline?.amount).toBe(77)
    expect(offline?._synced).toBe(false)
    expect(rows).toHaveLength(2)
  })

  it("reconciliação reescreve itens update/delete que apontam para o tempId", async () => {
    await db.syncQueue.bulkAdd([
      { id: 1, action: "create", entity: "ingredient", data: { name: "Farinha" }, tempId: "offline_a", createdAt: iso },
      { id: 2, action: "update", entity: "ingredient", data: { id: "offline_a", brand: "X" }, createdAt: iso },
      { id: 3, action: "delete", entity: "ingredient", data: { id: "offline_a" }, createdAt: iso },
    ])
    await db.ingredients.add({ id: "offline_a", name: "Farinha", stockKg: 0, minStockKg: 0, costPerKg: 1, supplier: "", _synced: false, _updatedAt: iso })

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({ ok: false, processed: [{ queueId: 1, ok: true, tempId: "offline_a", realId: "real-a" }] }),
          { status: 200 },
        )
      }),
    )

    await pushPendingChanges()

    const queue = await db.syncQueue.toArray()
    const update = queue.find((q) => q.action === "update")
    const del = queue.find((q) => q.action === "delete")
    expect(update?.data.id).toBe("real-a")
    expect(del?.data.id).toBe("real-a")
    expect(queue.some((q) => q.id === 1)).toBe(false)
  })

  it("reconciliação reescreve refs aninhadas em itens enfileirados (recipe → ingredient)", async () => {
    await db.syncQueue.bulkAdd([
      { id: 10, action: "create", entity: "ingredient", data: { name: "Aveia" }, tempId: "offline_b", createdAt: iso },
      {
        id: 11,
        action: "create",
        entity: "recipe",
        data: { name: "Panqueca", yield: 1, yieldUnit: "un", totalCost: 0, ingredients: [{ ingredientId: "offline_b", qty: 2, unit: "g" }] },
        tempId: "offline_c",
        createdAt: iso,
      },
    ])
    await db.ingredients.add({ id: "offline_b", name: "Aveia", stockKg: 0, minStockKg: 0, costPerKg: 1, supplier: "", _synced: false, _updatedAt: iso })

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({ ok: false, processed: [{ queueId: 10, ok: true, tempId: "offline_b", realId: "real-b" }] }),
          { status: 200 },
        )
      }),
    )

    await pushPendingChanges()

    const recipe = await db.syncQueue.get(11)
    expect(recipe?.data.ingredients).toBeDefined()
    expect((recipe?.data.ingredients as { ingredientId: string }[])[0].ingredientId).toBe("real-b")
  })

  it("push registra erros de itens falhos em syncErrors", async () => {
    await db.syncQueue.add({ id: 20, action: "update", entity: "cashFlow", data: { id: "server-1", description: "" }, createdAt: iso })

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(JSON.stringify({ ok: false, processed: [{ queueId: 20, ok: false, error: "Dados inválidos" }] }), { status: 200 })
      }),
    )

    await pushPendingChanges()

    const errs = await db.syncErrors.toArray()
    expect(errs).toHaveLength(1)
    expect(errs[0].entity).toBe("cashFlow")
    expect(errs[0].action).toBe("update")
    expect(errs[0].error).toBe("Dados inválidos")
    expect(errs[0].dropped).toBe(false)

    const queue = await db.syncQueue.toArray()
    expect(queue).toHaveLength(1)
    expect(queue[0].attempts).toBe(1)
  })

  it("push registra erro persistente (não descartado) para item com muitas tentativas", async () => {
    await db.syncQueue.add({ id: 21, action: "update", entity: "cashFlow", data: { id: "server-1", description: "" }, attempts: 4, lastAttemptAt: "2020-01-01T00:00:00.000Z", createdAt: iso })

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(JSON.stringify({ ok: false, processed: [{ queueId: 21, ok: false, error: "Dados inválidos" }] }), { status: 200 })
      }),
    )

    await pushPendingChanges()

    const errs = await db.syncErrors.toArray()
    expect(errs).toHaveLength(1)
    expect(errs[0].dropped).toBe(false)
    expect(errs[0].itemKey).toBe("cashFlow:server-1")

    const queue = await db.syncQueue.toArray()
    expect(queue).toHaveLength(1)
    expect(queue[0].attempts).toBe(5)
  })

  it("pull propaga exclusões de outros dispositivos e preserva linhas locais não sincronizadas", async () => {
    await db.ingredients.add({ id: "del-1", name: "Açúcar", stockKg: 0, minStockKg: 0, costPerKg: 1, supplier: "", _synced: true, _updatedAt: iso })
    await db.ingredients.add({ id: "del-local", name: "Chocolate", stockKg: 0, minStockKg: 0, costPerKg: 1, supplier: "", _synced: false, _updatedAt: iso })

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({ ingredients: [], deletions: [{ entity: "ingredient", recordId: "del-1" }, { entity: "ingredient", recordId: "del-local" }], serverTime: "2026-08-01T00:00:00.000Z" }),
          { status: 200 },
        )
      }),
    )

    const result = await pullChanges()
    expect(result.pulled).toBe(1)

    const rows = await db.ingredients.toArray()
    expect(rows.some((r) => r.id === "del-1")).toBe(false)
    expect(rows.some((r) => r.id === "del-local")).toBe(true)
    expect(await getLastSyncTime()).toBe("2026-08-01T00:00:00.000Z")
  })

  it("merge não ressuscita documento com exclusão pendente na fila", async () => {
    await db.syncQueue.add({ id: 99, action: "delete", entity: "document", data: { id: "real-1" }, createdAt: iso })

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        expect(url).toBe("/api/documents")
        return new Response(
          JSON.stringify([{ id: "real-1", title: "Ficha", category: "FICHA_TECNICA", description: null, content: null, fileUrl: null, tags: null }]),
          { status: 200 },
        )
      }),
    )

    const refreshed = new Promise<void>((resolve) => onDataRefresh(() => resolve()))
    await repository.documents.getAll()
    await refreshed

    const rows = await db.documents.toArray()
    expect(rows).toHaveLength(0)
  })

  it("delete de documento cancela create/update pendentes e limpa erros", async () => {
    await db.documents.add({ id: "offline_x", title: "Ficha", category: "FICHA_TECNICA", fileUrl: "data:application/pdf;base64,JVBERi0xLjQK", createdAt: iso, updatedAt: iso, _synced: false, _updatedAt: iso })
    await db.syncQueue.bulkAdd([
      { id: 1, action: "create", entity: "document", data: { id: "offline_x", title: "Ficha", category: "FICHA_TECNICA", fileUrl: "data:application/pdf;base64,JVBERi0xLjQK" }, tempId: "offline_x", createdAt: iso },
      { id: 2, action: "update", entity: "document", data: { id: "offline_x", title: "Ficha editada" }, createdAt: iso },
    ])
    await addSyncError({ entity: "document", action: "create", error: "Erro antigo", itemKey: "document:offline_x" })

    await repository.documents.delete("offline_x")

    const docs = await db.documents.toArray()
    expect(docs.some((d) => d.id === "offline_x")).toBe(false)

    const queue = await db.syncQueue.toArray()
    expect(queue.some((q) => q.action === "create" || q.action === "update")).toBe(false)
    expect(queue).toHaveLength(1)
    expect(queue[0].action).toBe("delete")
    expect(queue[0].data.id).toBe("offline_x")

    const errs = await db.syncErrors.toArray()
    expect(errs).toHaveLength(0)
  })

  it("push divide em lotes quando o corpo ultrapassa o limite da plataforma", async () => {
    const big1 = "a".repeat(1_500_000)
    const big2 = "b".repeat(1_500_000)
    const big3 = "c".repeat(1_500_000)
    await db.syncQueue.bulkAdd([
      { id: 1, action: "create", entity: "document", data: { id: "offline_a", title: "A", category: "FICHA_TECNICA", fileUrl: `data:application/pdf;base64,${big1}` }, tempId: "offline_a", createdAt: iso },
      { id: 2, action: "create", entity: "document", data: { id: "offline_b", title: "B", category: "FICHA_TECNICA", fileUrl: `data:application/pdf;base64,${big2}` }, tempId: "offline_b", createdAt: iso },
      { id: 3, action: "create", entity: "document", data: { id: "offline_c", title: "C", category: "FICHA_TECNICA", fileUrl: `data:application/pdf;base64,${big3}` }, tempId: "offline_c", createdAt: iso },
    ])

    const seenSizes: number[] = []
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        seenSizes.push(String(init.body).length)
        const body = JSON.parse(String(init.body))
        return new Response(
          JSON.stringify({ ok: true, processed: body.changes.map((c: { id: number }) => ({ queueId: c.id, ok: true })) }),
          { status: 200 },
        )
      }),
    )

    const result = await pushPendingChanges()

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(seenSizes.every((s) => s < MAX_PUSH_BODY)).toBe(true)
    expect(result.pushed).toBe(3)
    const queue = await db.syncQueue.toArray()
    expect(queue).toHaveLength(0)
  })

  it("push registra erro e backoff quando o servidor responde 413 (payload grande)", async () => {
    await db.syncQueue.add({ id: 40, action: "create", entity: "document", data: { id: "offline_big", title: "Big", category: "FICHA_TECNICA", fileUrl: `data:application/pdf;base64,${"d".repeat(3_900_000)}` }, tempId: "offline_big", createdAt: iso })

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response("FUNCTION_PAYLOAD_TOO_LARGE", { status: 413 })
      }),
    )

    const result = await pushPendingChanges()
    expect(result.pushed).toBe(0)
    expect(fetch).toHaveBeenCalledTimes(1)

    const errs = await db.syncErrors.toArray()
    expect(errs).toHaveLength(1)
    expect(errs[0].entity).toBe("document")
    expect(errs[0].error).toContain("limite da plataforma")
    expect(errs[0].itemKey).toBe("document:offline_big")

    const queue = await db.syncQueue.toArray()
    expect(queue).toHaveLength(1)
    expect(queue[0].attempts).toBe(1)
    expect(queue[0].lastAttemptAt).toBeDefined()
  })

  it("push envia item sobresize isolado e não trava os demais", async () => {
    const huge = "e".repeat(3_900_000)
    const small = "f".repeat(50)
    await db.syncQueue.bulkAdd([
      { id: 50, action: "create", entity: "document", data: { id: "offline_huge", title: "Huge", category: "FICHA_TECNICA", fileUrl: `data:application/pdf;base64,${huge}` }, tempId: "offline_huge", createdAt: iso },
      { id: 51, action: "create", entity: "document", data: { id: "offline_small", title: "Small", category: "FICHA_TECNICA", fileUrl: `data:application/pdf;base64,${small}` }, tempId: "offline_small", createdAt: iso },
    ])

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        const body = JSON.parse(String(init.body))
        const first = body.changes[0]
        if (first.id === 50) {
          return new Response("FUNCTION_PAYLOAD_TOO_LARGE", { status: 413 })
        }
        return new Response(JSON.stringify({ ok: true, processed: body.changes.map((c: { id: number }) => ({ queueId: c.id, ok: true })) }), { status: 200 })
      }),
    )

    const result = await pushPendingChanges()
    expect(result.pushed).toBe(1)
    expect(fetch).toHaveBeenCalledTimes(2)

    const queue = await db.syncQueue.toArray()
    expect(queue).toHaveLength(1)
    expect(queue[0].id).toBe(50)

    const errs = await db.syncErrors.toArray()
    expect(errs).toHaveLength(1)
    expect(errs[0].itemKey).toBe("document:offline_huge")
  })

  it("create de produto recalcula margem, reconcilia tempId e remapeia priceTiers pendentes", async () => {
    await db.syncQueue.bulkAdd([
      { id: 60, action: "create", entity: "product", data: { id: "offline_p", name: "Cookie", sku: "ck-1", category: "Doces", price: 10, cost: 4, unit: "un", active: true }, tempId: "offline_p", createdAt: iso },
      { id: 61, action: "create", entity: "priceTier", data: { name: "Assado", minQty: 3, maxQty: 5, price: 8, productId: "offline_p" }, tempId: "offline_t", createdAt: iso },
    ])
    await db.products.add({ id: "offline_p", name: "Cookie", sku: "ck-1", category: "Doces", price: 10, cost: 4, margin: 60, unit: "un", active: true, _synced: false, _updatedAt: iso })

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({ ok: false, processed: [{ queueId: 60, ok: true, tempId: "offline_p", realId: "real-p" }] }),
          { status: 200 },
        )
      }),
    )

    await pushPendingChanges()

    const products = await db.products.toArray()
    expect(products.some((p) => p.id === "offline_p")).toBe(false)
    const real = products.find((p) => p.id === "real-p")
    expect(real?._synced).toBe(true)
    expect(real?.margin).toBe(60)

    const queue = await db.syncQueue.toArray()
    const tier = queue.find((q) => q.id === 61)
    expect(tier?.data.productId).toBe("real-p")
    expect(queue.some((q) => q.id === 60)).toBe(false)
  })

  it("delete de produto remove priceTiers locais e enfileira exclusão", async () => {
    await db.products.add({ id: "p1", name: "Cookie", sku: "ck-1", category: "Doces", price: 10, cost: 4, margin: 60, unit: "un", active: true, _synced: true, _updatedAt: iso })
    await db.priceTiers.add({ id: "t1", name: "Assado", minQty: 3, maxQty: 5, price: 8, productId: "p1", _synced: true, _updatedAt: iso })

    await repository.products.delete("p1")

    const products = await db.products.toArray()
    expect(products).toHaveLength(0)
    const tiers = await db.priceTiers.toArray()
    expect(tiers).toHaveLength(0)

    const queue = await db.syncQueue.toArray()
    expect(queue).toHaveLength(1)
    expect(queue[0].action).toBe("delete")
    expect(queue[0].entity).toBe("product")
    expect(queue[0].data.id).toBe("p1")
  })

  it("pull escreve produtos vindos do servidor marcando como sincronizados", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({ products: [{ id: "srv-p", name: "Cookie", sku: "ck-2", category: "Doces", price: 12, cost: 5, margin: 58.33, unit: "un", active: true }] }),
          { status: 200 },
        )
      }),
    )

    const result = await pullChanges()
    expect(result.pulled).toBe(1)

    const row = await db.products.get("srv-p")
    expect(row?.name).toBe("Cookie")
    expect(row?._synced).toBe(true)
  })

  it("update de produto sem preço/custo preserva margem existente", async () => {
    await db.products.add({ id: "p1", name: "Cookie", sku: "ck-1", category: "Doces", price: 10, cost: 4, margin: 60, unit: "un", active: true, _synced: true, _updatedAt: iso })

    await repository.products.update("p1", { name: "Cookie Gourmet" })

    const row = await db.products.get("p1")
    expect(row?.name).toBe("Cookie Gourmet")
    expect(row?.margin).toBe(60)
  })

  it("create de produção reconcilia tempId e mantém status em minúsculas", async () => {
    await db.syncQueue.add({ id: 70, action: "create", entity: "production", data: { id: "offline_pr", batchCode: "LOTE-1", productId: "p1", qty: 20, status: "em_producao", startTime: iso }, tempId: "offline_pr", createdAt: iso })
    await db.productions.add({ id: "offline_pr", batchCode: "LOTE-1", productId: "p1", qty: 20, startTime: iso, status: "em_producao", _synced: false, _updatedAt: iso })

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({ ok: false, processed: [{ queueId: 70, ok: true, tempId: "offline_pr", realId: "real-pr" }] }),
          { status: 200 },
        )
      }),
    )

    await pushPendingChanges()

    const rows = await db.productions.toArray()
    expect(rows.some((p) => p.id === "offline_pr")).toBe(false)
    const real = rows.find((p) => p.id === "real-pr")
    expect(real?._synced).toBe(true)
    expect(real?.status).toBe("em_producao")
  })

  it("update de status de produção enfileira update com status em minúsculas", async () => {
    await db.productions.add({ id: "pr1", batchCode: "LOTE-1", productId: "p1", qty: 20, startTime: iso, status: "pendente", _synced: true, _updatedAt: iso })

    await repository.productions.updateStatus("pr1", "concluido", iso)

    const queue = await db.syncQueue.toArray()
    expect(queue).toHaveLength(1)
    expect(queue[0].entity).toBe("production")
    expect(queue[0].action).toBe("update")
    expect(queue[0].data.status).toBe("concluido")
    expect(queue[0].data.endTime).toBe(iso)
  })

  it("pull escreve priceTiers vindos do servidor marcando como sincronizados", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({ priceTiers: [{ id: "srv-t", name: "Assado 3un", minQty: 3, maxQty: 5, price: 8, productId: "p1" }] }),
          { status: 200 },
        )
      }),
    )

    const result = await pullChanges()
    expect(result.pulled).toBe(1)

    const row = await db.priceTiers.get("srv-t")
    expect(row?.name).toBe("Assado 3un")
    expect(row?._synced).toBe(true)
  })

  it("delete de insumo limpa recipeItems locais e remove do JSON das receitas", async () => {
    await db.ingredients.add({ id: "ing1", name: "Açúcar", stockKg: 1, minStockKg: 0, costPerKg: 5, supplier: "", _synced: true, _updatedAt: iso })
    await db.recipes.add({ id: "rec1", name: "Cookie", yield: 11, yieldUnit: "un", totalCost: 5, ingredients: JSON.stringify([{ ingredientId: "ing1", qty: 2, unit: "g" }]), createdAt: iso, updatedAt: iso, _synced: true, _updatedAt: iso })
    await db.recipeItems.add({ id: "ri1", recipeId: "rec1", ingredientId: "ing1", qty: 2, unit: "g", _synced: true })

    await repository.ingredients.delete("ing1")

    const ingredients = await db.ingredients.toArray()
    expect(ingredients).toHaveLength(0)
    const items = await db.recipeItems.toArray()
    expect(items).toHaveLength(0)
    const recipe = await db.recipes.get("rec1")
    expect(recipe?.ingredients).toBe("[]")

    const queue = await db.syncQueue.toArray()
    expect(queue).toHaveLength(2)
    expect(queue.some((q) => q.entity === "ingredient" && q.action === "delete")).toBe(true)
    const recipeUpdate = queue.find((q) => q.entity === "recipe")
    expect(recipeUpdate?.action).toBe("update")
    expect(recipeUpdate?.data.ingredients).toEqual([])
  })

  it("pull escreve canais vindos do servidor marcando como sincronizados", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({ channels: [{ id: "srv-c", name: "Balcão", commission: 0 }] }),
          { status: 200 },
        )
      }),
    )

    const result = await pullChanges()
    expect(result.pulled).toBe(1)

    const row = await db.channels.get("srv-c")
    expect(row?.name).toBe("Balcão")
    expect(row?._synced).toBe(true)
  })

  it("pull carimba _updatedAt com o updatedAt do servidor (não o relógio local)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({ products: [{ id: "srv-p2", name: "Cookie", sku: "ck-3", category: "Doces", price: 12, cost: 5, margin: 58.33, unit: "un", active: true, updatedAt: "2026-08-01T12:00:00.000Z" }] }),
          { status: 200 },
        )
      }),
    )

    const result = await pullChanges()
    expect(result.pulled).toBe(1)

    const row = await db.products.get("srv-p2")
    expect(row?._updatedAt).toBe("2026-08-01T12:00:00.000Z")
  })

  it("dead-letter: item reprovado em muitas tentativas é descartado com erro dropped", async () => {
    await db.syncQueue.add({ id: 22, action: "update", entity: "cashFlow", data: { id: "server-1", description: "" }, attempts: 9, lastAttemptAt: "2020-01-01T00:00:00.000Z", createdAt: iso })

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(JSON.stringify({ ok: false, processed: [{ queueId: 22, ok: false, error: "Dados inválidos" }] }), { status: 200 })
      }),
    )

    await pushPendingChanges()

    const queue = await db.syncQueue.toArray()
    expect(queue).toHaveLength(0)

    const errs = await db.syncErrors.toArray()
    expect(errs).toHaveLength(1)
    expect(errs[0].dropped).toBe(true)
    expect(errs[0].itemKey).toBe("cashFlow:server-1")
  })
})
