const REF_KEYS = new Set(["id", "orderId", "contactId", "ingredientId", "channelId", "productId"])

export function resolveRefs(data: unknown, map: Map<string, string>): unknown {
  if (Array.isArray(data)) return data.map((v) => resolveRefs(v, map))
  if (data && typeof data === "object") {
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      out[key] = resolveRefs(value, map)
      if (REF_KEYS.has(key) && typeof value === "string") {
        const real = map.get(value)
        if (real) out[key] = real
      }
    }
    return out
  }
  return data
}

export async function runDelete<T>(op: () => Promise<T>): Promise<T | null> {
  try {
    return await op()
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2025") return null
    throw e
  }
}
