import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { PaymentError } from "@/lib/payments/errors"

const mocks = vi.hoisted(() => ({
  productFindMany: vi.fn(),
  customerFindUnique: vi.fn(),
  orderCreate: vi.fn(),
  orderUpdate: vi.fn(),
  orderFindUnique: vi.fn(),
  orderFindFirst: vi.fn(),
  orderDelete: vi.fn(),
  createOrderPayment: vi.fn(),
  reconcileOrderPayment: vi.fn(),
  assertSlotAvailable: vi.fn(),
  engineCalculatePrice: vi.fn(),
  paymentEventUpdate: vi.fn(),
  loyaltyRefundOnCancel: vi.fn(),
  transaction: vi.fn(),
  couponFindUnique: vi.fn(),
  couponUpdateMany: vi.fn(),
  deliveryRouteFindUnique: vi.fn(),
  syncCustomerToContact: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: { findMany: mocks.productFindMany },
    customer: { findUnique: mocks.customerFindUnique },
    order: {
      create: mocks.orderCreate,
      update: mocks.orderUpdate,
      findUnique: mocks.orderFindUnique,
      findFirst: mocks.orderFindFirst,
      delete: mocks.orderDelete,
    },
    deliveryRoute: {
      findUnique: mocks.deliveryRouteFindUnique,
    },
    paymentEvent: {
      update: mocks.paymentEventUpdate,
    },
    coupon: {
      findUnique: mocks.couponFindUnique,
      updateMany: mocks.couponUpdateMany,
    },
    $transaction: mocks.transaction,
  },
}))

vi.mock("@/lib/customer-contact", () => ({
  syncCustomerToContact: mocks.syncCustomerToContact,
}))

vi.mock("@/lib/payments/service", () => ({
  createOrderPayment: mocks.createOrderPayment,
  reconcileOrderPayment: mocks.reconcileOrderPayment,
}))

vi.mock("@/lib/loyalty/service", () => ({
  LoyaltyService: {
    refundOnCancel: mocks.loyaltyRefundOnCancel,
  },
}))

vi.mock("@/lib/delivery-scheduling", () => ({
  assertSlotAvailable: mocks.assertSlotAvailable,
  SlotError: class SlotError extends Error {
    code: string
    constructor(code: string, message: string) {
      super(message)
      this.name = "SlotError"
      this.code = code
    }
  },
}))

vi.mock("@so-cookies/pricing", () => ({
  buildPricingEngine: () => ({ calculatePrice: mocks.engineCalculatePrice }),
}))

import { createCustomerOrder, updateCustomerOrder, retryCustomerOrderPayment } from "@/lib/customer-orders"

const baseCreatedOrder = {
  id: "ord-1",
  total: 42.5,
  status: "PENDENTE",
  pickupCode: "ABC12",
  paymentStatus: null,
  items: [{ id: "i1", productId: "p1", qty: 2, price: 21.25, product: { id: "p1", name: "Cookie" }, name: null }],
  deliveryRoute: null,
  deliveryZone: null,
}

describe("createCustomerOrder — pagamento PIX", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.productFindMany.mockResolvedValue([{ id: "p1", name: "Cookie", price: 21.25, active: true, deletedAt: null }])
    mocks.customerFindUnique.mockResolvedValue({
      id: "cust-1",
      name: "Maria",
      phone: "11999999999",
      email: "maria@email.com",
      addressCep: null,
      addressStreet: null,
      addressNumber: null,
      addressComplement: null,
      addressNeighborhood: null,
      addressCity: null,
      addressState: null,
    })
    mocks.engineCalculatePrice.mockResolvedValue({
      total: 42.5,
      state: { items: [{ productId: "p1", qty: 2, calculatedPrice: 21.25 }] },
    })
    mocks.orderCreate.mockResolvedValue(baseCreatedOrder)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("marca pedido como EXPIRADO (não deleta) e propaga o erro quando createOrderPayment falha", async () => {
    mocks.createOrderPayment.mockRejectedValue(new PaymentError("NO_PAYER_EMAIL", "Cliente sem e-mail"))
    mocks.orderUpdate.mockResolvedValue({})

    await expect(
      createCustomerOrder("cust-1", {
        items: [{ productId: "p1", qty: 2 }],
        paymentMethod: "PIX",
      }),
    ).rejects.toMatchObject({ code: "NO_PAYER_EMAIL" })

    expect(mocks.orderDelete).not.toHaveBeenCalled()
    expect(mocks.orderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ord-1" },
        data: expect.objectContaining({ paymentStatus: "EXPIRADO", status: "CANCELADO" }),
      }),
    )
  })

  it("mantém o pedido criado e atualiza campos de pagamento quando o PIX é gerado", async () => {
    mocks.createOrderPayment.mockResolvedValue({})
    mocks.orderFindUnique.mockResolvedValue({ ...baseCreatedOrder, paymentStatus: "AGUARDANDO_PAGAMENTO" })

    const result = await createCustomerOrder("cust-1", {
      items: [{ productId: "p1", qty: 2 }],
      paymentMethod: "PIX",
    })

    expect(mocks.orderDelete).not.toHaveBeenCalled()
    expect(result.paymentStatus).toBe("AGUARDANDO_PAGAMENTO")
  })

  it("persiste as observações do pedido", async () => {
    const result = await createCustomerOrder("cust-1", {
      items: [{ productId: "p1", qty: 2 }],
      notes: "  Sem glúten, por favor  ",
    })

    expect(mocks.orderCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ notes: "Sem glúten, por favor" }),
      }),
    )
    expect(result.total).toBe(42.5)
  })

  it("sincroniza contato com o endereço de entrega resolvido", async () => {
    mocks.deliveryRouteFindUnique.mockResolvedValue({ id: "route-1", zoneId: "zone-1", name: "Rota Centro" })
    mocks.orderCreate.mockResolvedValue({
      ...baseCreatedOrder,
      deliveryStreet: "Rua Nova",
      deliveryCity: "São Paulo",
    })

    await createCustomerOrder("cust-1", {
      items: [{ productId: "p1", qty: 2 }],
      deliveryDate: "2026-08-10",
      deliveryRouteId: "route-1",
      deliveryCep: "01000-000",
      deliveryStreet: "Rua Nova",
      deliveryNumber: "10",
      deliveryComplement: "Apto 2",
      deliveryNeighborhood: "Centro",
      deliveryCity: "São Paulo",
      deliveryState: "SP",
    })

    expect(mocks.syncCustomerToContact).toHaveBeenCalledWith({
      id: "cust-1",
      name: "Maria",
      email: "maria@email.com",
      phone: "11999999999",
      addressCep: "01000-000",
      addressStreet: "Rua Nova",
      addressNumber: "10",
      addressComplement: "Apto 2",
      addressNeighborhood: "Centro",
      addressCity: "São Paulo",
      addressState: "SP",
    })
  })

  it("sincroniza contato com endereço do cliente quando entrega não informa endereço", async () => {
    mocks.deliveryRouteFindUnique.mockResolvedValue({ id: "route-1", zoneId: "zone-1", name: "Rota Centro" })
    mocks.customerFindUnique.mockResolvedValue({
      id: "cust-1",
      name: "Maria",
      phone: "11999999999",
      email: "maria@email.com",
      addressCep: "02000-000",
      addressStreet: "Rua Casa",
      addressNumber: "5",
      addressComplement: null,
      addressNeighborhood: "Bairro",
      addressCity: "São Paulo",
      addressState: "SP",
    })
    mocks.orderCreate.mockResolvedValue(baseCreatedOrder)

    await createCustomerOrder("cust-1", {
      items: [{ productId: "p1", qty: 2 }],
      deliveryDate: "2026-08-10",
      deliveryRouteId: "route-1",
    })

    expect(mocks.syncCustomerToContact).toHaveBeenCalledWith(
      expect.objectContaining({
        addressCep: "02000-000",
        addressStreet: "Rua Casa",
        addressNumber: "5",
        addressCity: "São Paulo",
        addressState: "SP",
      }),
    )
  })

  it("rejeita pedido quando o total mudou desde a prévia (PRICE_CHANGED)", async () => {
    await expect(
      createCustomerOrder("cust-1", {
        items: [{ productId: "p1", qty: 2 }],
        expectedTotal: 50,
      }),
    ).rejects.toMatchObject({ code: "PRICE_CHANGED" })
    expect(mocks.orderCreate).not.toHaveBeenCalled()
  })

  it("aceita pedido quando expectedTotal bate com o total calculado", async () => {
    mocks.orderCreate.mockResolvedValue(baseCreatedOrder)

    const result = await createCustomerOrder("cust-1", {
      items: [{ productId: "p1", qty: 2 }],
      expectedTotal: 42.5,
    })

    expect(mocks.orderCreate).toHaveBeenCalled()
    expect(result.total).toBe(42.5)
  })

  it("incrementa usedCount do cupom junto com a criação do pedido", async () => {
    mocks.engineCalculatePrice.mockResolvedValue({
      total: 38.25,
      state: {
        items: [{ productId: "p1", qty: 2, calculatedPrice: 19.125 }],
        logs: [{ value: { couponCode: "BEM10", couponName: "Bem vindo" } }],
      },
    })
    mocks.transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        coupon: { findUnique: mocks.couponFindUnique, updateMany: mocks.couponUpdateMany },
        order: { create: mocks.orderCreate },
      }),
    )
    mocks.couponFindUnique.mockResolvedValue({ id: "coup-1", code: "BEM10", usageLimit: 10 })
    mocks.couponUpdateMany.mockResolvedValue({ count: 1 })
    mocks.orderCreate.mockResolvedValue({ ...baseCreatedOrder, total: 38.25 })

    const result = await createCustomerOrder("cust-1", {
      items: [{ productId: "p1", qty: 2 }],
      couponCode: "bem10",
    })

    expect(mocks.transaction).toHaveBeenCalled()
    expect(mocks.couponUpdateMany).toHaveBeenCalledWith({
      where: { id: "coup-1", usedCount: { lt: 10 } },
      data: { usedCount: { increment: 1 } },
    })
    expect(result.total).toBe(38.25)
  })

  it("rejeita pedido quando o cupom está esgotado (claim transacional)", async () => {
    mocks.engineCalculatePrice.mockResolvedValue({
      total: 38.25,
      state: {
        items: [{ productId: "p1", qty: 2, calculatedPrice: 19.125 }],
        logs: [{ value: { couponCode: "BEM10" } }],
      },
    })
    mocks.transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        coupon: { findUnique: mocks.couponFindUnique, updateMany: mocks.couponUpdateMany },
        order: { create: mocks.orderCreate },
      }),
    )
    mocks.couponFindUnique.mockResolvedValue({ id: "coup-1", code: "BEM10", usageLimit: 1 })
    mocks.couponUpdateMany.mockResolvedValue({ count: 0 })

    await expect(
      createCustomerOrder("cust-1", {
        items: [{ productId: "p1", qty: 2 }],
        couponCode: "BEM10",
      }),
    ).rejects.toMatchObject({ code: "COUPON_UNAVAILABLE" })
  })
})

describe("retryCustomerOrderPayment — reconciliação contra dupla cobrança", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("não gera novo PIX quando o MP já aprovou o PIX anterior", async () => {
    mocks.orderFindFirst.mockResolvedValue({
      id: "ord-1",
      customerId: "cust-1",
      status: "PENDENTE",
      paymentStatus: "EXPIRADO",
      paymentExpiresAt: new Date(),
      total: 42.5,
      paymentProviderId: "123",
      deliveryRouteId: null,
      deliveryDate: null,
      items: [{ id: "i1", qty: 2, price: 21.25 }],
    })
    mocks.reconcileOrderPayment.mockResolvedValue(true)

    await expect(retryCustomerOrderPayment("cust-1", "ord-1")).rejects.toMatchObject({
      code: "ALREADY_PAID",
    })
    expect(mocks.createOrderPayment).not.toHaveBeenCalled()
  })

  it("gera novo PIX quando o PIX anterior não foi pago", async () => {
    mocks.orderFindFirst.mockResolvedValue({
      id: "ord-1",
      customerId: "cust-1",
      status: "PENDENTE",
      paymentStatus: "EXPIRADO",
      paymentExpiresAt: new Date(),
      total: 42.5,
      paymentProviderId: "123",
      deliveryRouteId: null,
      deliveryDate: null,
      items: [{ id: "i1", qty: 2, price: 21.25 }],
    })
    mocks.reconcileOrderPayment.mockResolvedValue(false)
    mocks.createOrderPayment.mockResolvedValue({})
    mocks.orderUpdate.mockResolvedValue({})
    mocks.orderFindUnique.mockResolvedValue({ ...baseCreatedOrder, paymentStatus: "AGUARDANDO_PAGAMENTO" })

    const result = await retryCustomerOrderPayment("cust-1", "ord-1")

    expect(mocks.createOrderPayment).toHaveBeenCalledWith("ord-1")
    expect(result?.paymentStatus).toBe("AGUARDANDO_PAGAMENTO")
  })
})

describe("updateCustomerOrder — cancelamento", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.orderFindFirst.mockResolvedValue({
      id: "ord-1",
      customerId: "cust-1",
      status: "PENDENTE",
      paymentStatus: "AGUARDANDO_PAGAMENTO",
      total: 42.5,
      items: [{ id: "i1", qty: 2, price: 21.25 }],
      paymentEvents: [{ id: "pe-1", type: "PAYMENT", status: "RECEIVED", orderId: "ord-1" }],
    })
    mocks.orderUpdate.mockResolvedValue({ id: "ord-1", status: "CANCELADO" })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("cancela pedido PENDENTE com sucesso", async () => {
    const result = await updateCustomerOrder("cust-1", "ord-1", { status: "CANCELADO" })
    expect(mocks.orderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ord-1" },
        data: expect.objectContaining({ status: "CANCELADO" }),
      }),
    )
    expect(mocks.paymentEventUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "pe-1" },
        data: expect.objectContaining({ status: "CANCELLED" }),
      }),
    )
    expect(mocks.loyaltyRefundOnCancel).toHaveBeenCalledWith("ord-1")
    expect(result.status).toBe("CANCELADO")
  })

  it("rejeita cancelamento de pedido já em PRODUCAO", async () => {
    mocks.orderFindFirst.mockResolvedValue({
      id: "ord-1",
      customerId: "cust-1",
      status: "PRODUCAO",
      paymentStatus: null,
      total: 42.5,
      items: [{ id: "i1", qty: 2, price: 21.25 }],
      paymentEvents: [],
    })

    await expect(updateCustomerOrder("cust-1", "ord-1", { status: "CANCELADO" })).rejects.toThrow(
      "Este pedido não pode mais ser cancelado",
    )
  })

  it("rejeita cancelamento de pedido já CONCLUIDO", async () => {
    mocks.orderFindFirst.mockResolvedValue({
      id: "ord-1",
      customerId: "cust-1",
      status: "CONCLUIDO",
      paymentStatus: null,
      total: 42.5,
      items: [{ id: "i1", qty: 2, price: 21.25 }],
      paymentEvents: [],
    })

    await expect(updateCustomerOrder("cust-1", "ord-1", { status: "CANCELADO" })).rejects.toThrow(
      "Este pedido não pode mais ser cancelado",
    )
  })

  it("não tenta cancelar pagamento quando status é alterado sem CANCELADO", async () => {
    mocks.orderFindFirst.mockResolvedValue({
      id: "ord-1",
      customerId: "cust-1",
      status: "PENDENTE",
      paymentStatus: "AGUARDANDO_PAGAMENTO",
      total: 42.5,
      items: [{ id: "i1", qty: 2, price: 21.25 }],
      paymentEvents: [{ id: "pe-1", type: "PAYMENT", status: "RECEIVED", orderId: "ord-1" }],
    })

    await updateCustomerOrder("cust-1", "ord-1", { status: "CONFIRMADO" })
    expect(mocks.paymentEventUpdate).not.toHaveBeenCalled()
  })

  it("sincroniza contato com o endereço do pedido ao atualizar entrega", async () => {
    mocks.orderFindFirst.mockResolvedValue({
      id: "ord-1",
      customerId: "cust-1",
      status: "PENDENTE",
      paymentStatus: null,
      total: 42.5,
      items: [{ id: "i1", qty: 2, price: 21.25 }],
      paymentEvents: [],
    })
    mocks.orderUpdate.mockResolvedValue({
      id: "ord-1",
      customer: "Maria",
      customerPhone: "11999999999",
      deliveryStreet: "Rua Entrega",
      deliveryNumber: "99",
      deliveryComplement: null,
      deliveryNeighborhood: null,
      deliveryCity: "São Paulo",
      deliveryState: "SP",
      deliveryCep: "03000-000",
    })
    mocks.customerFindUnique.mockResolvedValue({ id: "cust-1", email: "maria@email.com" })
    mocks.deliveryRouteFindUnique.mockResolvedValue({ id: "route-1", zoneId: "zone-1", name: "Rota Centro" })

    await updateCustomerOrder("cust-1", "ord-1", {
      deliveryDate: "2026-08-10",
      deliveryRouteId: "route-1",
      deliveryStreet: "Rua Entrega",
      deliveryNumber: "99",
      deliveryCity: "São Paulo",
      deliveryState: "SP",
      deliveryCep: "03000-000",
    })

    expect(mocks.syncCustomerToContact).toHaveBeenCalledWith({
      id: "cust-1",
      name: "Maria",
      email: "maria@email.com",
      phone: "11999999999",
      addressCep: "03000-000",
      addressStreet: "Rua Entrega",
      addressNumber: "99",
      addressComplement: null,
      addressNeighborhood: null,
      addressCity: "São Paulo",
      addressState: "SP",
    })
  })
})
