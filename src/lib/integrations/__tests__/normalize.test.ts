import { describe, it, expect } from "vitest"
import { normalize99FoodOrder, normalizeIfoodOrder } from "@/lib/integrations/normalize"

const nineFoodFixture = {
  id: "ord-99-1",
  status: "CREATED",
  items: [
    { id: "it-1", name: "Cookie Red Velvet", quantity: 2, unitPrice: { value: 12.5, currency: "BRL" }, totalPrice: { value: 25, currency: "BRL" }, options: [{ name: "Borda com chocolate" }] },
    { id: "it-2", name: "Limonada", quantity: 1, totalPrice: { value: 8, currency: "BRL" } },
  ],
  otherFees: [
    { name: "Taxa de Entrega", type: "DELIVERY_FEE", receivedBy: "MERCHANT", price: { value: 5, currency: "BRL" } },
    { name: "Taxa da Plataforma", type: "COMMISSION", receivedBy: "MARKETPLACE", price: { value: 4.5, currency: "BRL" } },
  ],
  totalPrice: { value: 38, currency: "BRL" },
  observations: "Sem cebola",
  customer: { name: "João Silva", phone: { number: "+5511999999999" }, id: "c-1" },
  delivery: { deliveredBy: "ORDERING_APP", deliveryAddress: { formattedAddress: "Rua A, 100 - Centro, São Paulo - SP", postalCode: "01000-000" } },
}

describe("normalize99FoodOrder", () => {
  it("normaliza pedido com itens, endereço, telefone e taxa de plataforma", () => {
    const order = normalize99FoodOrder(nineFoodFixture)
    expect(order.externalId).toBe("ord-99-1")
    expect(order.channel).toBe("99Food")
    expect(order.customer).toBe("João Silva")
    expect(order.customerPhone).toBe("+5511999999999")
    expect(order.deliveryAddress).toBe("Rua A, 100 - Centro, São Paulo - SP")
    expect(order.total).toBe(38)
    expect(order.notes).toBe("Sem cebola")
    expect(order.items).toEqual([
      { name: "Cookie Red Velvet", qty: 2, price: 12.5, notes: "Borda com chocolate" },
      { name: "Limonada", qty: 1, price: 8, notes: undefined },
    ])
    expect(order.platformFee).toBe(4.5)
  })

  it("ignora taxa de entrega recebida pelo merchant (não é taxa de plataforma)", () => {
    const order = normalize99FoodOrder(nineFoodFixture)
    expect(order.platformFee).toBe(4.5)
    expect(order.platformFee).not.toBe(5)
  })
})

const ifoodFixture = {
  id: "ord-ifood-1",
  code: "300",
  status: "PLACED",
  items: [
    { id: "i-1", name: "Cookie com Nutella", quantity: 3, totalPrice: 33, options: [{ name: "Extra chocolate" }] },
    { id: "i-2", name: "Suco de Laranja", quantity: 1, totalPrice: 7 },
  ],
  otherFees: [
    { name: "Entrega", type: "DELIVERY_FEE", receivedBy: "MERCHANT", amount: 6 },
    { name: "Comissão iFood", type: "COMMISSION", receivedBy: "MARKETPLACE", amount: 9.9 },
  ],
  total: 49,
  observations: "Chegar rápido",
  customer: { name: "Maria", phone: { number: "11988887777" } },
  delivery: { deliveryAddress: { formattedAddress: "Av B, 200 - Moema, SP" } },
}

describe("normalizeIfoodOrder", () => {
  it("normaliza pedido com itens, telefone, endereço e comissão", () => {
    const order = normalizeIfoodOrder(ifoodFixture)
    expect(order.externalId).toBe("ord-ifood-1")
    expect(order.channel).toBe("iFood")
    expect(order.customer).toBe("Maria")
    expect(order.customerPhone).toBe("11988887777")
    expect(order.deliveryAddress).toBe("Av B, 200 - Moema, SP")
    expect(order.total).toBe(49)
    expect(order.notes).toBe("Chegar rápido")
    expect(order.items).toEqual([
      { name: "Cookie com Nutella", qty: 3, price: 11, notes: "Extra chocolate" },
      { name: "Suco de Laranja", qty: 1, price: 7, notes: undefined },
    ])
    expect(order.platformFee).toBe(9.9)
  })
})
