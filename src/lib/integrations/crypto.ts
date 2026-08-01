import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto"

const ALGORITHM = "aes-256-gcm"

function getKey(): Buffer {
  const key = process.env.INTEGRATION_KEY
  if (!key) {
    throw new Error("INTEGRATION_KEY não configurada no servidor")
  }
  return createHash("sha256").update(key).digest()
}

export function encryptCredentials(value: unknown): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`
}

export function decryptCredentials<T>(token: string): T {
  const parts = token.split(".")
  if (parts.length !== 3) throw new Error("Credenciais inválidas")
  const [ivB64, tagB64, dataB64] = parts
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"))
  decipher.setAuthTag(Buffer.from(tagB64, "base64"))
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()])
  return JSON.parse(decrypted.toString("utf8"))
}
