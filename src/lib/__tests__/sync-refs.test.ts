import { describe, it, expect } from "vitest"
import { resolveRefs, runDelete } from "@/lib/sync-refs"

const map = new Map([
  ["offline_1", "real-1"],
  ["offline_2", "real-2"],
])

describe("resolveRefs", () => {
  it("resolve id, orderId, contactId e ingredientId", () => {
    const data = { id: "offline_1", orderId: "offline_1", contactId: "offline_2", ingredientId: "offline_2" }
    expect(resolveRefs(data, map)).toEqual({ id: "real-1", orderId: "real-1", contactId: "real-2", ingredientId: "real-2" })
  })

  it("resolve channelId e productId", () => {
    const data = { channelId: "offline_1", productId: "offline_2" }
    expect(resolveRefs(data, map)).toEqual({ channelId: "real-1", productId: "real-2" })
  })

  it("resolve ingredientId dentro de array de ingredients", () => {
    const data = {
      ingredients: [
        { ingredientId: "offline_2", qty: 2, unit: "g" },
        { ingredientId: "real-existente", qty: 1, unit: "un" },
      ],
    }
    expect(resolveRefs(data, map)).toEqual({
      ingredients: [
        { ingredientId: "real-2", qty: 2, unit: "g" },
        { ingredientId: "real-existente", qty: 1, unit: "un" },
      ],
    })
  })

  it("não altera chaves sem correspondência (nem strings iguais a tempId em campos comuns)", () => {
    const data = { id: "real-1", name: "offline_1", notes: "texto offline_1", total: 5 }
    expect(resolveRefs(data, map)).toEqual(data)
  })

  it("é idempotente", () => {
    const once = resolveRefs({ id: "offline_1", ingredients: [{ ingredientId: "offline_2" }] }, map)
    expect(resolveRefs(once, map)).toEqual(once)
  })

  it("preserva objetos sem refs", () => {
    const data = { name: "Farinha", stockKg: 10 }
    expect(resolveRefs(data, map)).toEqual(data)
  })
})

describe("runDelete", () => {
  it("engole P2025 (registro já inexistente)", async () => {
    await expect(runDelete(async () => { throw { code: "P2025" } })).resolves.toBeNull()
  })

  it("repassa outros erros", async () => {
    await expect(runDelete(async () => { throw new Error("boom") })).rejects.toThrow("boom")
  })
})
