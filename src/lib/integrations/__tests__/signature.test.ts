import { describe, it, expect } from "vitest"
import { createHmac } from "crypto"
import { verifyHmacSha256, hmacSha256Hex } from "@/lib/integrations/signature"

const secret = "client-secret-teste"
const body = JSON.stringify({ eventId: "abc-123", eventType: "CREATED", orderId: "ord-1" })

function sign(data: string, key: string): string {
  return createHmac("sha256", key).update(data).digest("hex")
}

describe("signature", () => {
  it("hmacSha256Hex produz assinatura esperada", () => {
    expect(hmacSha256Hex(body, secret)).toBe(sign(body, secret))
  })

  it("aceita assinatura válida (99Food/iFood)", () => {
    expect(verifyHmacSha256(body, secret, sign(body, secret))).toBe(true)
  })

  it("rejeita segredo errado", () => {
    expect(verifyHmacSha256(body, secret, sign(body, "outro-segredo"))).toBe(false)
  })

  it("rejeita body adulterado", () => {
    const tampered = body.replace("CREATED", "CANCELLED")
    expect(verifyHmacSha256(tampered, secret, sign(body, secret))).toBe(false)
  })

  it("rejeita assinatura ausente, vazia ou malformada", () => {
    expect(verifyHmacSha256(body, secret, null)).toBe(false)
    expect(verifyHmacSha256(body, secret, "")).toBe(false)
    expect(verifyHmacSha256(body, secret, "zzz-not-hex")).toBe(false)
    expect(verifyHmacSha256(body, secret, "aabb")).toBe(false)
  })
})
