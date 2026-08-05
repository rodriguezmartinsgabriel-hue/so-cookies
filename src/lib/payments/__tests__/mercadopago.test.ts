import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { createPixPayment, getPixPayment } from "@/lib/payments/mercadopago"
import { PaymentError } from "@/lib/payments/errors"

describe("mercadopago.createPixPayment", () => {
  beforeEach(() => {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = "APP_USR-teste"
  })

  afterEach(() => {
    delete process.env.MERCADO_PAGO_ACCESS_TOKEN
    vi.unstubAllGlobals()
  })

  it("post nos /v1/payments com corpo e cabeçalhos corretos e devolve QR", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        id: 5466310457,
        status: "pending",
        point_of_interaction: {
          transaction_data: {
            qr_code: "00020126600014br.gov.bcb.pix0117",
            qr_code_base64: "iVBORw0KGgoAAAANSUhEUg",
            ticket_url: "https://www.mercadopago.com.br/payments/5466310457/ticket",
          },
        },
      }),
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await createPixPayment({
      transactionAmount: 42.5,
      description: "Pedido Só Cookies ABC12",
      payerEmail: "cliente@email.com",
      externalReference: "order:ord-1",
      notificationUrl: "https://loja.com/api/payments/webhook/mercadopago",
      expiresAt: new Date("2026-08-05T18:30:00.000Z"),
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe("https://api.mercadopago.com/v1/payments")
    expect(opts.method).toBe("POST")
    expect(opts.headers.Authorization).toBe("Bearer APP_USR-teste")
    expect(opts.headers["Content-Type"]).toBe("application/json")
    expect(opts.headers["X-Idempotency-Key"]).toMatch(/^[0-9a-f-]{36}$/i)
    const body = JSON.parse(opts.body)
    expect(body).toMatchObject({
      transaction_amount: 42.5,
      payment_method_id: "pix",
      external_reference: "order:ord-1",
      notification_url: "https://loja.com/api/payments/webhook/mercadopago",
      date_of_expiration: "2026-08-05T18:30:00.000Z",
    })
    expect(body.payer.email).toBe("cliente@email.com")
    expect(result).toEqual({
      id: 5466310457,
      status: "pending",
      qrCode: "00020126600014br.gov.bcb.pix0117",
      qrCodeBase64: "iVBORw0KGgoAAAANSUhEUg",
    })
  })

  it("lança PaymentError quando o MP retorna erro", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: "invalid" }),
    }))
    await expect(createPixPayment({
      transactionAmount: 10,
      description: "Pedido",
      payerEmail: "a@b.com",
      externalReference: "order:x",
      notificationUrl: null,
      expiresAt: new Date(),
    })).rejects.toBeInstanceOf(PaymentError)
  })

  it("lança PaymentError quando o QR não vem na resposta", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 1, status: "pending", point_of_interaction: {} }),
    }))
    await expect(createPixPayment({
      transactionAmount: 10,
      description: "Pedido",
      payerEmail: "a@b.com",
      externalReference: "order:x",
      notificationUrl: null,
      expiresAt: new Date(),
    })).rejects.toThrow("não retornou os dados do PIX")
  })

  it("lança erro se o token não está configurado", async () => {
    delete process.env.MERCADO_PAGO_ACCESS_TOKEN
    await expect(createPixPayment({
      transactionAmount: 10,
      description: "Pedido",
      payerEmail: "a@b.com",
      externalReference: "order:x",
      notificationUrl: null,
      expiresAt: new Date(),
    })).rejects.toThrow(/MERCADO_PAGO_ACCESS_TOKEN/)
  })
})

describe("mercadopago.getPixPayment", () => {
  afterEach(() => {
    delete process.env.MERCADO_PAGO_ACCESS_TOKEN
    vi.unstubAllGlobals()
  })

  it("busca o pagamento com Bearer e devolve o payload", async () => {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = "APP_USR-teste"
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 123, status: "approved", transaction_amount: 10 }),
    })
    vi.stubGlobal("fetch", fetchMock)
    const result = await getPixPayment("123")
    expect(result.status).toBe("approved")
    expect(fetchMock).toHaveBeenCalledWith("https://api.mercadopago.com/v1/payments/123", expect.objectContaining({
      headers: { Authorization: "Bearer APP_USR-teste" },
    }))
  })

  it("lança PAYMENT_NOT_FOUND em resposta 404", async () => {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = "APP_USR-teste"
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    }))
    await expect(getPixPayment("123")).rejects.toMatchObject({ code: "PAYMENT_NOT_FOUND" })
  })

  it("lança PROVIDER_ERROR em resposta 500", async () => {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = "APP_USR-teste"
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    }))
    await expect(getPixPayment("123")).rejects.toMatchObject({ code: "PROVIDER_ERROR" })
  })
})
