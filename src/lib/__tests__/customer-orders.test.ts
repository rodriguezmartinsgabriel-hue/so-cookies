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
  assertSlotAvailable: vi.fn(),
  engineCalculatePrice: vi.fn(),
  paymentEventUpdate: vi.fn(),
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
    paymentEvent: {
      update: mocks.paymentEventUpdate,
    },
  },
}))

vi.mock("@/lib/payments/service", () => ({
  createOrderPayment: mocks.createOrderPayment,
}))

vi.mock("./delivery-scheduling", () => ({
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

import { createCustomerOrder, updateCustomerOrder } from "@/lib/customer-orders"

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
      id: "cust-1", name: "Maria", phone: "11999999999",
      email: "maria@email.com",
      addressCep: null, addressStreet: null, addressNumber: null,
      addressComplement: null, addressNeighborhood: null, addressCity: null, addressState: null,
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

  it("marca pedido como EXPIRADO (não deleta) quando createOrderPayment lança PaymentError", async () => {
    mocks.createOrderPayment.mockRejectedValue(new PaymentError("NO_PAYER_EMAIL", "Cliente sem e-mail"))
    mocks.orderUpdate.mockResolvedValue({})
    mocks.orderFindUnique.mockResolvedValue({ ...baseCreatedOrder, paymentStatus: "EXPIRADO", status: "CANCELADO" })

    const result = await createCustomerOrder("cust-1", {
      items: [{ productId: "p1", qty: 2 }],
      paymentMethod: "PIX",
    })

    expect(mocks.orderDelete).not.toHaveBeenCalled()
    expect(mocks.orderUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "ord-1" },
      data: expect.objectContaining({ paymentStatus: "EXPIRADO", status: "CANCELADO" }),
    }))
    expect(result.paymentStatus).toBe("EXPIRADO")
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
      paymentEvents: [
        { id: "pe-1", type: "PAYMENT", status: "RECEIVED", orderId: "ord-1" },
      ],
    })
    mocks.orderUpdate.mockResolvedValue({ id: "ord-1", status: "CANCELADO" })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("cancela pedido PENDENTE com sucesso", async () => {
    const result = await updateCustomerOrder("cust-1", "ord-1", { status: "CANCELADO" })
    expect(mocks.orderUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "ord-1" },
      data: expect.objectContaining({ status: "CANCELADO" }),
    }))
    expect(mocks.paymentEventUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "pe-1" },
      data: expect.objectContaining({ status: "CANCELLED" }),
    }))
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

    await expect(
      updateCustomerOrder("cust-1", "ord-1", { status: "CANCELADO" })
    ).rejects.toThrow("Este pedido não pode mais ser cancelado")
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

    await expect(
      updateCustomerOrder("cust-1", "ord-1", { status: "CANCELADO" })
    ).rejects.toThrow("Este pedido não pode mais ser cancelado")
  })

  it("não tenta cancelar pagamento quando status é alterado sem CANCELADO", async () => {
    mocks.orderFindFirst.mockResolvedValue({
      id: "ord-1",
      customerId: "cust-1",
      status: "PENDENTE",
      paymentStatus: "AGUARDANDO_PAGAMENTO",
      total: 42.5,
      items: [{ id: "i1", qty: 2, price: 21.25 }],
      paymentEvents: [
        { id: "pe-1", type: "PAYMENT", status: "RECEIVED", orderId: "ord-1" },
      ],
    })

    await updateCustomerOrder("cust-1", "ord-1", { status: "CONFIRMADO" })
    expect(mocks.paymentEventUpdate).not.toHaveBeenCalled()
  })
})
