import { describe, it, expect, afterAll } from "vitest"
import { encryptCredentials, decryptCredentials } from "@/lib/integrations/crypto"

describe("crypto", () => {
  afterAll(() => {
    delete process.env.INTEGRATION_KEY
  })

  it("criptografa e descriptografa credenciais", () => {
    process.env.INTEGRATION_KEY = "chave-de-teste"
    const creds = { appId: "app", appShoppId: "shop", clientSecret: "segredo" }
    const token = encryptCredentials(creds)
    expect(token).not.toContain("segredo")
    expect(decryptCredentials<typeof creds>(token)).toEqual(creds)
  })

  it("produz tokens únicos para o mesmo valor (IV aleatório)", () => {
    process.env.INTEGRATION_KEY = "chave-de-teste"
    const a = encryptCredentials({ x: 1 })
    const b = encryptCredentials({ x: 1 })
    expect(a).not.toBe(b)
  })

  it("lança erro se INTEGRATION_KEY não estiver configurada", () => {
    delete process.env.INTEGRATION_KEY
    expect(() => encryptCredentials({ x: 1 })).toThrow(/INTEGRATION_KEY/)
  })

  it("lança erro se o ciphertext for adulterado", () => {
    process.env.INTEGRATION_KEY = "chave-de-teste"
    const token = encryptCredentials({ x: 1 })
    const [iv, tag, data] = token.split(".")
    const corrupted = Buffer.from(data, "base64")
    corrupted[0] = corrupted[0] ^ 0xff
    expect(() => decryptCredentials(`${iv}.${tag}.${corrupted.toString("base64")}`)).toThrow()
  })
})
