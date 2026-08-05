import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from "crypto"

const ALGORITHM = "aes-256-gcm"
const VERSION_PREFIX = "v2."
const SCRYPT_SALT = "so-cookies-integration-v2"
const SCRYPT_KEYLEN = 32
const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1

let cachedKey: Buffer | null = null

function getSecret(): string {
  const key = process.env.INTEGRATION_KEY
  if (!key) {
    throw new Error("INTEGRATION_KEY não configurada no servidor")
  }
  return key
}

function deriveStrongKey(): Buffer {
  return scryptSync(getSecret(), SCRYPT_SALT, SCRYPT_KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P })
}

function getStrongKey(): Buffer {
  if (!cachedKey) {
    cachedKey = deriveStrongKey()
  }
  return cachedKey
}

function getLegacyKey(): Buffer {
  return createHash("sha256").update(getSecret()).digest()
}

function decryptWithKey<T>(key: Buffer, token: string): T {
  const parts = token.split(".")
  if (parts.length !== 3) throw new Error("Credenciais inválidas")
  const [ivB64, tagB64, dataB64] = parts
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, "base64"))
  decipher.setAuthTag(Buffer.from(tagB64, "base64"))
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()])
  return JSON.parse(decrypted.toString("utf8"))
}

export function encryptCredentials(value: unknown): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, getStrongKey(), iv)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${VERSION_PREFIX}${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`
}

export function decryptCredentials<T>(token: string): T {
  if (token.startsWith(VERSION_PREFIX)) {
    return decryptWithKey<T>(getStrongKey(), token.slice(VERSION_PREFIX.length))
  }
  return decryptWithKey<T>(getLegacyKey(), token)
}

export function isVersion2Token(token: string): boolean {
  return token.startsWith(VERSION_PREFIX)
}
