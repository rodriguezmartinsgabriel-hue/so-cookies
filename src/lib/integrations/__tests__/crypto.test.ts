import { describe, it, expect, afterAll } from "vitest"
import { createCipheriv, createHash, randomBytes } from "crypto"
import { encryptCredentials, decryptCredentials, isVersion2Token } from "@/lib/integrations/crypto"

describe("crypto", () => {
  afterAll(() => {
    delete process.env.INTEGRATION_KEY
  })

  it("lança erro se INTEGRATION_KEY não estiver configurada", () => {
    delete process.env.INTEGRATION_KEY
    expect(() => encryptCredentials({ x: 1 })).toThrow(/INTEGRATION_KEY/)
  })

  it("criptografa e descriptografa credenciais (v2)", () => {
    process.env.INTEGRATION_KEY = "chave-de-teste"
    const creds = { appId: "app", appShoppId: "shop", clientSecret: "segredo" }
    const token = encryptCredentials(creds)
    expect(token).not.toContain("segredo")
    expect(token.startsWith("v2.")).toBe(true)
    expect(isVersion2Token(token)).toBe(true)
    expect(decryptCredentials<typeof creds>(token)).toEqual(creds)
  })

  it("produz tokens únicos para o mesmo valor (IV aleatório)", () => {
    process.env.INTEGRATION_KEY = "chave-de-teste"
    const a = encryptCredentials({ x: 1 })
    const b = encryptCredentials({ x: 1 })
    expect(a).not.toBe(b)
  })

  it("descriptografa credenciais no formato legado (SHA-256 sem prefixo)", () => {
    process.env.INTEGRATION_KEY = "chave-de-teste"
    const creds = { appId: "legado", clientSecret: "segredo-antigo" }
    const iv = randomBytes(12)
    const key = createHash("sha256").update("chave-de-teste").digest()
    const cipher = createCipheriv("aes-256-gcm", key, iv)
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(creds), "utf8"), cipher.final()])
    const tag = cipher.getAuthTag()
    const legacy = `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`

    expect(isVersion2Token(legacy)).toBe(false)
    expect(decryptCredentials<typeof creds>(legacy)).toEqual(creds)
  })

  it("lança erro se o ciphertext for adulterado (v2)", () => {
    process.env.INTEGRATION_KEY = "chave-de-teste"
    const token = encryptCredentials({ x: 1 })
    const [iv, tag, data] = token.slice(3).split(".")
    const corrupted = Buffer.from(data, "base64")
    corrupted[0] = corrupted[0] ^ 0xff
    expect(() => decryptCredentials(`v2.${iv}.${tag}.${corrupted.toString("base64")}`)).toThrow()
  })
})
