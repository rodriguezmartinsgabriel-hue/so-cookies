import { createHmac, timingSafeEqual } from "crypto"

export function verifyWebhookSignature(input: {
  secret: string | null
  xSignature: string | null
  xRequestId: string | null
  dataId: string | null
}): boolean {
  const { secret, xSignature } = input
  if (!secret || !xSignature) return false

  const parts = Object.fromEntries(
    xSignature.split(",").map((part) => {
      const [key, ...rest] = part.trim().split("=")
      return [key, rest.join("=")]
    }),
  )
  const ts = parts.ts
  const v1 = parts.v1
  if (!ts || !v1) return false

  // Manifest no formato id:...;request-id:...;ts:...;
  // Pares ausentes são omitidos (ex.: data.id de ORD vem em minúsculas)
  const pairs: string[] = []
  if (input.dataId) pairs.push(`id:${input.dataId.toLowerCase()}`)
  if (input.xRequestId) pairs.push(`request-id:${input.xRequestId}`)
  pairs.push(`ts:${ts}`)
  const manifest = `${pairs.join(";")};`

  const expected = createHmac("sha256", secret).update(manifest).digest("hex")
  const a = Buffer.from(v1, "utf8")
  const b = Buffer.from(expected, "utf8")
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
