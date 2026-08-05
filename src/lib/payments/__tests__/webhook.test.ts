import { describe, it, expect } from "vitest"
import { createHmac } from "crypto"
import { verifyWebhookSignature, diagnoseWebhookSignature } from "@/lib/payments/webhook"

const SECRET = "chave-secreta-de-teste"

function sign(secret: string, dataId: string, xRequestId: string, ts: string): string {
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
  const v1 = createHmac("sha256", secret).update(manifest).digest("hex")
  return `ts=${ts},v1=${v1}`
}

describe("verifyWebhookSignature", () => {
  it("aceita assinatura válida", () => {
    const dataId = "123456"
    const xRequestId = "9f4a1c2e-3d5b-4a7f-8c6e-1d2b3c4d5e6f"
    const ts = "1742505638683"
    const xSignature = sign(SECRET, dataId, xRequestId, ts)
    expect(verifyWebhookSignature({ secret: SECRET, xSignature, xRequestId, dataId })).toBe(true)
  })

  it("rejeita assinatura adulterada", () => {
    const dataId = "123456"
    const xRequestId = "req-1"
    const ts = "1742505638683"
    const xSignature = sign(SECRET, dataId, xRequestId, ts)
    const tampered = `ts=${ts},v1=${"0".repeat(64)}`
    expect(verifyWebhookSignature({ secret: SECRET, xSignature: tampered, xRequestId, dataId })).toBe(false)
  })

  it("rejeita quando v1 tem tamanho diferente (evita timingSafeEqual throw)", () => {
    const xSignature = `ts=123,v1=abc`
    expect(verifyWebhookSignature({ secret: SECRET, xSignature, xRequestId: "r", dataId: "d" })).toBe(false)
  })

  it("rejeita sem secret ou sem x-signature", () => {
    expect(verifyWebhookSignature({ secret: null, xSignature: "ts=1,v1=x", xRequestId: "r", dataId: "d" })).toBe(false)
    expect(verifyWebhookSignature({ secret: SECRET, xSignature: null, xRequestId: "r", dataId: "d" })).toBe(false)
  })

  it("usa data.id em minúsculas no manifest (ordens ORD...)", () => {
    const dataId = "ORD01JQ4S4KY8HWQ6NA5PXB65B3D3"
    const xRequestId = "req-1"
    const ts = "123"
    const xSignature = sign(SECRET, dataId.toLowerCase(), xRequestId, ts)
    expect(verifyWebhookSignature({ secret: SECRET, xSignature, xRequestId, dataId })).toBe(true)
  })

  it("omite request-id quando ausente", () => {
    const dataId = "123"
    const ts = "123"
    const manifest = `id:${dataId};ts:${ts};`
    const v1 = createHmac("sha256", SECRET).update(manifest).digest("hex")
    const xSignature = `ts=${ts},v1=${v1}`
    expect(verifyWebhookSignature({ secret: SECRET, xSignature, xRequestId: null, dataId })).toBe(true)
  })
})

describe("diagnoseWebhookSignature", () => {
  const dataId = "123456"
  const xRequestId = "req-1"
  const ts = "1742505638683"

  it("sinaliza match com request-id quando a assinatura usa request-id", () => {
    const v1 = createHmac("sha256", SECRET).update(`id:${dataId};request-id:${xRequestId};ts:${ts};`).digest("hex")
    const xSignature = `ts=${ts},v1=${v1}`
    const diag = diagnoseWebhookSignature({ secret: SECRET, xSignature, xRequestId, dataId })
    expect(diag.secretConfigured).toBe(true)
    expect(diag.xSignaturePresent).toBe(true)
    expect(diag.xRequestIdPresent).toBe(true)
    expect(diag.dataIdPresent).toBe(true)
    expect(diag.tsParsed).toBe(true)
    expect(diag.v1Parsed).toBe(true)
    expect(diag.matchWithRequestId).toBe(true)
    expect(diag.matchWithoutRequestId).toBe(false)
  })

  it("sinaliza match sem request-id quando a assinatura omite o header", () => {
    const v1 = createHmac("sha256", SECRET).update(`id:${dataId};ts:${ts};`).digest("hex")
    const xSignature = `ts=${ts},v1=${v1}`
    const diag = diagnoseWebhookSignature({ secret: SECRET, xSignature, xRequestId: null, dataId })
    expect(diag.xRequestIdPresent).toBe(false)
    expect(diag.matchWithoutRequestId).toBe(true)
    expect(diag.matchWithRequestId).toBe(false)
  })

  it("sinaliza secretConfigured false quando não há secret", () => {
    const v1 = createHmac("sha256", SECRET).update(`id:${dataId};ts:${ts};`).digest("hex")
    const xSignature = `ts=${ts},v1=${v1}`
    const diag = diagnoseWebhookSignature({ secret: null, xSignature, xRequestId: null, dataId })
    expect(diag.secretConfigured).toBe(false)
    expect(diag.matchWithRequestId).toBe(false)
    expect(diag.matchWithoutRequestId).toBe(false)
  })

  it("sinaliza false para ambos os matches com secret errado", () => {
    const v1 = createHmac("sha256", SECRET).update(`id:${dataId};ts:${ts};`).digest("hex")
    const xSignature = `ts=${ts},v1=${v1}`
    const diag = diagnoseWebhookSignature({ secret: "outro-secret", xSignature, xRequestId: null, dataId })
    expect(diag.matchWithRequestId).toBe(false)
    expect(diag.matchWithoutRequestId).toBe(false)
  })
})
