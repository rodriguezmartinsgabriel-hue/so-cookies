import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  orderFindUnique: vi.fn(),
  orderUpdate: vi.fn(),
  orderUpdateMany: vi.fn(),
  orderFindMany: vi.fn(),
  paymentEventCreate: vi.fn(),
  createPixPayment: vi.fn(),
  getPixPayment: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: {
      findUnique: mocks.orderFindUnique,
      update: mocks.orderUpdate,
      updateMany: mocks.orderUpdateMany,
      findMany: mocks.orderFindMany,
    },
    paymentEvent: {
      create: mocks.paymentEventCreate,
    },
  },
}))

vi.mock("@/lib/payments/mercadopago", () => ({
  createPixPayment: mocks.createPixPayment,
  getPixPayment: mocks.getPixPayment,
}))

import { createOrderPayment, handlePaymentWebhook, expireUnpaidOrders } from "@/lib/payments/service"
import { PaymentError } from "@/lib/payments/errors"

describe("createOrderPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.MERCADO_PAGO_ACCESS_TOKEN = "APP_USR-teste"
    process.env.MERCADO_PAGO_NOTIFICATION_URL = "https://loja.com/api/payments/webhook/mercadopago"
  })

  afterEach(() => {
    delete process.env.MERCADO_PAGO_ACCESS_TOKEN
    delete process.env.MERCADO_PAGO_NOTIFICATION_URL
  })

  it("cria pagamento PIX e grava os campos no pedido", async () => {
    mocks.orderFindUnique.mockResolvedValue({
      id: "ord-1",
      total: 42.5,
      pickupCode: "ABC12",
      paymentStatus: null,
      customerRef: { email: "cliente@email.com" },
    })
    mocks.createPixPayment.mockResolvedValue({
      id: 5466310457,
      status: "pending",
      qrCode: "000201...",
      qrCodeBase64: "iVBOR...",
    })
    mocks.orderUpdate.mockResolvedValue({ id: "ord-1" })

    await createOrderPayment("ord-1")

    expect(mocks.createPixPayment).toHaveBeenCalledWith(expect.objectContaining({
      transactionAmount: 42.5,
      payerEmail: "cliente@email.com",
      externalReference: "order:ord-1",
      notificationUrl: "https://loja.com/api/payments/webhook/mercadopago",
    }))
    expect(mocks.orderUpdate).toHaveBeenCalledWith({
      where: { id: "ord-1" },
      data: expect.objectContaining({
        paymentStatus: "AGUARDANDO_PAGAMENTO",
        paymentProvider: "MERCADO_PAGO",
        paymentProviderId: "5466310457",
        paymentExternalRef: "order:ord-1",
        paymentQrCode: "000201...",
        paymentQrCodeBase64: "iVBOR...",
      }),
    })
    expect(mocks.paymentEventCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "payment.created", status: "VERIFIED" }),
    }))
  })

  it("lança ALREADY_PAID se o pedido já foi pago", async () => {
    mocks.orderFindUnique.mockResolvedValue({ id: "ord-1", total: 10, paymentStatus: "PAGO", customerRef: { email: "a@b.com" } })
    await expect(createOrderPayment("ord-1")).rejects.toMatchObject({ code: "ALREADY_PAID" })
  })

  it("lança NO_PAYER_EMAIL se o cliente não tem e-mail", async () => {
    mocks.orderFindUnique.mockResolvedValue({ id: "ord-1", total: 10, paymentStatus: null, customerRef: { email: null } })
    await expect(createOrderPayment("ord-1")).rejects.toMatchObject({ code: "NO_PAYER_EMAIL" })
  })

  it("lança PAYMENTS_DISABLED quando não configurado", async () => {
    delete process.env.MERCADO_PAGO_ACCESS_TOKEN
    mocks.orderFindUnique.mockResolvedValue({ id: "ord-1", total: 10, paymentStatus: null, customerRef: { email: "a@b.com" } })
    await expect(createOrderPayment("ord-1")).rejects.toMatchObject({ code: "PAYMENTS_DISABLED" })
  })

  it("lança ORDER_NOT_FOUND se o pedido não existe", async () => {
    mocks.orderFindUnique.mockResolvedValue(null)
    await expect(createOrderPayment("nada")).rejects.toMatchObject({ code: "ORDER_NOT_FOUND" })
  })
})

describe("handlePaymentWebhook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.MERCADO_PAGO_ACCESS_TOKEN = "APP_USR-teste"
  })

  afterEach(() => {
    delete process.env.MERCADO_PAGO_ACCESS_TOKEN
  })

  it("aprovado confirma o pedido e marca PAGO", async () => {
    mocks.getPixPayment.mockResolvedValue({
      id: 123,
      status: "approved",
      status_detail: "accredited",
      transaction_amount: 42.5,
      external_reference: "order:ord-1",
      payer: { email: "a@b.com" },
    })
    mocks.orderFindUnique.mockResolvedValue({ id: "ord-1", total: 42.5, status: "PENDENTE", paymentStatus: "AGUARDANDO_PAGAMENTO" })

    const result = await handlePaymentWebhook({ paymentId: "123" })

    expect(result).toEqual({ ok: true, action: "paid" })
    expect(mocks.orderUpdate).toHaveBeenCalledWith({
      where: { id: "ord-1" },
      data: expect.objectContaining({ status: "CONFIRMADO", paymentStatus: "PAGO" }),
    })
  })

  it("webhook duplicado não gera segundo update", async () => {
    mocks.getPixPayment.mockResolvedValue({
      id: 123,
      status: "approved",
      status_detail: "accredited",
      transaction_amount: 42.5,
      external_reference: "order:ord-1",
      payer: { email: "a@b.com" },
    })
    mocks.orderFindUnique.mockResolvedValue({ id: "ord-1", total: 42.5, status: "CONFIRMADO", paymentStatus: "PAGO" })

    const result = await handlePaymentWebhook({ paymentId: "123" })
    expect(result.action).toBe("already_paid")
    expect(mocks.orderUpdate).not.toHaveBeenCalled()
  })

  it("valor divergente é ignorado", async () => {
    mocks.getPixPayment.mockResolvedValue({
      id: 123,
      status: "approved",
      status_detail: "accredited",
      transaction_amount: 1.0,
      external_reference: "order:ord-1",
      payer: { email: "a@b.com" },
    })
    mocks.orderFindUnique.mockResolvedValue({ id: "ord-1", total: 42.5, status: "PENDENTE", paymentStatus: "AGUARDANDO_PAGAMENTO" })

    const result = await handlePaymentWebhook({ paymentId: "123" })
    expect(result.action).toBe("amount_mismatch")
    expect(mocks.orderUpdate).not.toHaveBeenCalled()
    expect(mocks.paymentEventCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "amount.mismatch", status: "IGNORED" }),
    }))
  })

  it("pagamento não aprovado não altera o pedido", async () => {
    mocks.getPixPayment.mockResolvedValue({
      id: 123,
      status: "pending",
      status_detail: "pending_waiting_transfer",
      transaction_amount: 42.5,
      external_reference: "order:ord-1",
      payer: { email: "a@b.com" },
    })
    mocks.orderFindUnique.mockResolvedValue({ id: "ord-1", total: 42.5, status: "PENDENTE", paymentStatus: "AGUARDANDO_PAGAMENTO" })

    const result = await handlePaymentWebhook({ paymentId: "123" })
    expect(result.action).toBe("not_approved")
    expect(mocks.orderUpdate).not.toHaveBeenCalled()
  })

  it("notificação sem pedido correspondente é ignorada", async () => {
    mocks.getPixPayment.mockResolvedValue({
      id: 999,
      status: "approved",
      status_detail: "accredited",
      transaction_amount: 10,
      external_reference: "order:inexistente",
      payer: { email: "a@b.com" },
    })
    mocks.orderFindUnique.mockResolvedValue(null)

    const result = await handlePaymentWebhook({ paymentId: "999" })
    expect(result.action).toBe("ignored")
    expect(mocks.orderUpdate).not.toHaveBeenCalled()
  })
})

describe("expireUnpaidOrders", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("cancela pedidos com pagamento expirado e libera o slot", async () => {
    mocks.orderFindMany.mockResolvedValue([{ id: "ord-1" }, { id: "ord-2" }])
    mocks.orderUpdateMany.mockResolvedValue({ count: 2 })

    const count = await expireUnpaidOrders()

    expect(count).toBe(2)
    expect(mocks.orderFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        paymentStatus: "AGUARDANDO_PAGAMENTO",
        status: "PENDENTE",
      }),
    }))
    expect(mocks.orderUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ["ord-1", "ord-2"] } },
      data: expect.objectContaining({ paymentStatus: "EXPIRADO", status: "CANCELADO" }),
    })
  })

  it("retorna 0 sem pedidos expirados", async () => {
    mocks.orderFindMany.mockResolvedValue([])
    expect(await expireUnpaidOrders()).toBe(0)
    expect(mocks.orderUpdateMany).not.toHaveBeenCalled()
  })
})
