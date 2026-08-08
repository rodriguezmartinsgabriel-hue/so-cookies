import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { createHmac } from "crypto"
import { POST as mpWebhookPost, GET as mpWebhookGet } from "@/app/api/payments/webhook/mercadopago/route"

const mocks = vi.hoisted(() => ({
  handlePaymentWebhook: vi.fn(),
  logPaymentEvent: vi.fn(),
}))

vi.mock("@/lib/payments/service", () => ({
  handlePaymentWebhook: mocks.handlePaymentWebhook,
  logPaymentEvent: mocks.logPaymentEvent,
}))

const SECRET = "chave-secreta-de-webhook"

function signedPost(dataId: string, type = "payment") {
  const ts = "1742505638683"
  const xRequestId = "9f4a1c2e-3d5b-4a7f-8c6e-1d2b3c4d5e6f"
  const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId};ts:${ts};`
  const v1 = createHmac("sha256", SECRET).update(manifest).digest("hex")
  const xSignature = `ts=${ts},v1=${v1}`
  const url = `https://store.example.com/api/payments/webhook/mercadopago?type=${type}&data.id=${dataId}`
  return new Request(url, {
    method: "POST",
    headers: { "x-signature": xSignature, "x-request-id": xRequestId },
  })
}

describe("Mercado Pago webhook route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = SECRET
    mocks.handlePaymentWebhook.mockResolvedValue({ ok: true, action: "paid" })
    mocks.logPaymentEvent.mockResolvedValue(undefined)
  })

  afterEach(() => {
    delete process.env.MERCADO_PAGO_WEBHOOK_SECRET
  })

  it("rejeita assinatura inválida com 401 e grava PaymentEvent de rejeição", async () => {
    const res = await mpWebhookPost(
      new Request("https://store.example.com/api/payments/webhook/mercadopago?type=payment&data.id=123", {
        method: "POST",
      }),
    )
    expect(res.status).toBe(401)
    expect(mocks.handlePaymentWebhook).not.toHaveBeenCalled()
    expect(mocks.logPaymentEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: "123",
        action: "webhook.signature.invalid",
        status: "REJECTED",
      }),
    )
  })

  it("processa notificação de pagamento assinada", async () => {
    const res = await mpWebhookPost(signedPost("123"))
    expect(res.status).toBe(200)
    expect(mocks.handlePaymentWebhook).toHaveBeenCalledWith({ paymentId: "123" })
  })

  it("rejeita assinatura adulterada", async () => {
    const req = await signedPost("123")
    const bad = new Request(req.url, {
      method: "POST",
      headers: { "x-signature": "ts=1,v1=0", "x-request-id": "x" },
    })
    const res = await mpWebhookPost(bad)
    expect(res.status).toBe(401)
    expect(mocks.handlePaymentWebhook).not.toHaveBeenCalled()
  })

  it("ignora tópicos que não sejam payment respondendo 200", async () => {
    const res = await mpWebhookPost(signedPost("ORD123", "order"))
    expect(res.status).toBe(200)
    expect(mocks.handlePaymentWebhook).not.toHaveBeenCalled()
  })

  it("responde 200 mesmo quando o processamento falha (evita retry desnecessário do MP)", async () => {
    mocks.handlePaymentWebhook.mockRejectedValue(new Error("boom"))
    const res = await mpWebhookPost(signedPost("123"))
    expect(res.status).toBe(200)
  })

  it("rejeita 401 quando o secret não está configurado", async () => {
    delete process.env.MERCADO_PAGO_WEBHOOK_SECRET
    const res = await mpWebhookPost(signedPost("123"))
    expect(res.status).toBe(401)
  })
})

describe("Mercado Pago webhook route — GET challenge", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("retorna o challenge quando presente (validação de posse da URL)", async () => {
    const res = await mpWebhookGet(
      new Request("https://store.example.com/api/payments/webhook/mercadopago?challenge=abc123"),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ challenge: "abc123" })
  })

  it("retorna ok sem challenge", async () => {
    const res = await mpWebhookGet(
      new Request("https://store.example.com/api/payments/webhook/mercadopago"),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })
})
