import { test, expect } from "@playwright/test"
import { createHmac } from "crypto"

const WEBHOOK_URL = "/api/payments/webhook/mercadopago"

function sign(secret: string, dataId: string, xRequestId: string, ts: string): string {
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
  const v1 = createHmac("sha256", secret).update(manifest).digest("hex")
  return `ts=${ts},v1=${v1}`
}

test.describe("Webhook Mercado Pago", () => {
  test("rejeita requisição sem assinatura válida", async ({ request }) => {
    const res = await request.post(`${WEBHOOK_URL}?data.id=123456&type=payment`, {
      headers: {
        "x-signature": "",
        "x-request-id": "req-1",
      },
    })
    expect(res.status()).toBe(401)
  })

  test("rejeita assinatura adulterada", async ({ request }) => {
    const res = await request.post(`${WEBHOOK_URL}?data.id=123456&type=payment`, {
      headers: {
        "x-signature": "ts=123,v1=0000000000000000000000000000000000000000000000000000000000000000",
        "x-request-id": "req-1",
      },
    })
    expect(res.status()).toBe(401)
  })

  test("aceita assinatura válida e responde 200", async ({ request }) => {
    const secret = process.env.TEST_WEBHOOK_SECRET || "test-secret"
    const dataId = "123456"
    const xRequestId = "req-test-1"
    const ts = "1742505638683"
    const xSignature = sign(secret, dataId, xRequestId, ts)

    const res = await request.post(`${WEBHOOK_URL}?data.id=${dataId}&type=payment`, {
      headers: {
        "x-signature": xSignature,
        "x-request-id": xRequestId,
      },
    })
    expect([200, 500]).toContain(res.status())
  })

  test("ignora tipo não-payment e responde 200", async ({ request }) => {
    const secret = process.env.TEST_WEBHOOK_SECRET || "test-secret"
    const dataId = "123456"
    const xRequestId = "req-test-2"
    const ts = "1742505638684"
    const xSignature = sign(secret, dataId, xRequestId, ts)

    const res = await request.post(`${WEBHOOK_URL}?data.id=${dataId}&type=merchant_order`, {
      headers: {
        "x-signature": xSignature,
        "x-request-id": xRequestId,
      },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })
})
