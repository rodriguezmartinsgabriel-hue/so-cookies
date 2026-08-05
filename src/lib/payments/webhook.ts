import { createHmac, timingSafeEqual } from "crypto"

type SignatureInput = {
  secret: string | null
  xSignature: string | null
  xRequestId: string | null
  dataId: string | null
}

function parseSignature(xSignature: string | null): { ts?: string; v1?: string } {
  if (!xSignature) return {}
  return Object.fromEntries(
    xSignature.split(",").map((part) => {
      const [key, ...rest] = part.trim().split("=")
      return [key, rest.join("=")]
    }),
  )
}

// Manifest no formato id:...;request-id:...;ts:...;
// Pares ausentes são omitidos (ex.: data.id de ORD vem em minúsculas)
function buildManifest(dataId: string | null, xRequestId: string | null, ts: string): string {
  const pairs: string[] = []
  if (dataId) pairs.push(`id:${dataId.toLowerCase()}`)
  if (xRequestId) pairs.push(`request-id:${xRequestId}`)
  pairs.push(`ts:${ts}`)
  return `${pairs.join(";")};`
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8")
  const right = Buffer.from(b, "utf8")
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export function verifyWebhookSignature(input: SignatureInput): boolean {
  const { secret, xSignature } = input
  if (!secret || !xSignature) return false

  const parts = parseSignature(xSignature)
  const ts = parts.ts
  const v1 = parts.v1
  if (!ts || !v1) return false

  const manifest = buildManifest(input.dataId, input.xRequestId, ts)
  const expected = createHmac("sha256", secret).update(manifest).digest("hex")
  return safeEqual(v1, expected)
}

export function diagnoseWebhookSignature(input: SignatureInput) {
  const { secret, xSignature, xRequestId, dataId } = input
  const parts = parseSignature(xSignature)
  const ts = parts.ts
  const v1 = parts.v1

  const hmacHex = (manifest: string) =>
    secret ? createHmac("sha256", secret).update(manifest).digest("hex") : null

  const manifestWithRequestId = buildManifest(dataId, xRequestId, ts ?? "")
  const manifestWithoutRequestId = buildManifest(dataId, null, ts ?? "")

  const matchWithRequestId =
    Boolean(secret && xRequestId && ts && v1) &&
    safeEqual(v1 as string, hmacHex(manifestWithRequestId) ?? "")
  const matchWithoutRequestId =
    Boolean(secret && ts && v1) && safeEqual(v1 as string, hmacHex(manifestWithoutRequestId) ?? "")

  return {
    secretConfigured: Boolean(secret),
    xSignaturePresent: Boolean(xSignature),
    xRequestIdPresent: Boolean(xRequestId),
    dataIdPresent: Boolean(dataId),
    tsParsed: Boolean(ts),
    v1Parsed: Boolean(v1),
    matchWithRequestId,
    matchWithoutRequestId,
  }
}
