import { createHmac, timingSafeEqual } from "crypto"

function toBuffer(hex: string): Buffer {
  try {
    return Buffer.from(hex, "hex")
  } catch {
    return Buffer.alloc(0)
  }
}

export function hmacSha256Hex(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("hex")
}

export function verifyHmacSha256(data: string, secret: string, signature: string | null | undefined): boolean {
  if (!signature) return false
  const expected = toBuffer(signature)
  const actual = Buffer.from(hmacSha256Hex(data, secret), "hex")
  if (expected.length !== actual.length || expected.length === 0) return false
  return timingSafeEqual(expected, actual)
}
