import { describe, it, expect } from "vitest"
import { createOrderSchema, createSaleSchema, createIngredientSchema, createCashFlowSchema } from "@/lib/validation"

describe("createOrderSchema", () => {
  it("accepts valid order", () => {
    const result = createOrderSchema.parse({
      channel: "WhatsApp",
      customer: "João",
      total: 50,
      items: [{ productId: "p1", qty: 2, price: 25 }],
    })
    expect(result.customer).toBe("João")
  })

  it("rejects empty customer", () => {
    expect(() => createOrderSchema.parse({
      channel: "WhatsApp",
      customer: "",
      total: 50,
      items: [{ productId: "p1", qty: 2, price: 25 }],
    })).toThrow()
  })

  it("rejects empty items", () => {
    expect(() => createOrderSchema.parse({
      channel: "WhatsApp",
      customer: "João",
      total: 0,
      items: [],
    })).toThrow()
  })
})

describe("createSaleSchema", () => {
  it("accepts valid sale", () => {
    const result = createSaleSchema.parse({
      channelId: "c1",
      total: 100,
      items: [{ productId: "p1", qty: 1, price: 100 }],
    })
    expect(result.channelId).toBe("c1")
  })
})

describe("createIngredientSchema", () => {
  it("accepts valid ingredient", () => {
    const result = createIngredientSchema.parse({
      name: "Farinha",
      costPerKg: 5,
      supplier: "Fornecedor A",
    })
    expect(result.name).toBe("Farinha")
  })

  it("rejects missing name", () => {
    expect(() => createIngredientSchema.parse({
      costPerKg: 5,
      supplier: "Fornecedor A",
    })).toThrow()
  })
})

describe("createCashFlowSchema", () => {
  it("accepts valid entrada", () => {
    const result = createCashFlowSchema.parse({
      type: "ENTRADA",
      category: "Vendas",
      description: "Venda do dia",
      amount: 500,
    })
    expect(result.type).toBe("ENTRADA")
  })

  it("accepts valid saida", () => {
    const result = createCashFlowSchema.parse({
      type: "SAIDA",
      category: "Fornecedores",
      description: "Compra de insumos",
      amount: 200,
    })
    expect(result.amount).toBe(200)
  })

  it("rejects invalid type", () => {
    expect(() => createCashFlowSchema.parse({
      type: "INVALIDO",
      category: "Vendas",
      description: "teste",
      amount: 100,
    })).toThrow()
  })
})
