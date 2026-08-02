type WindowEntry = { count: number; resetAt: number }

const buckets = new Map<string, WindowEntry>()

const SWEEP_THRESHOLD = 1_000

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number }

function sweepExpired(now: number) {
  if (buckets.size < SWEEP_THRESHOLD) return
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key)
  }
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  return request.headers.get("x-real-ip") || "unknown"
}

export function rateLimit(request: Request, limit: number, windowMs: number): RateLimitResult {
  const key = getClientIp(request)
  const now = Date.now()
  sweepExpired(now)

  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true }
  }

  bucket.count++
  if (bucket.count > limit) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) }
  }
  return { ok: true }
}

export function clearRateLimitBuckets() {
  buckets.clear()
}
