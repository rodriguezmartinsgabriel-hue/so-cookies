export class PricingCache {
  private cache = new Map<
    string,
    {
      data: unknown
      timestamp: number
      ttl: number
    }
  >()

  constructor(private defaultTTL: number = 5 * 60 * 1000) {}

  set(key: string, data: unknown, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) return null

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  getKeys(): string[] {
    return Array.from(this.cache.keys())
  }

  getStats(): { total: number; hits: number; misses: number } {
    return {
      total: this.cache.size,
      hits: 0,
      misses: 0,
    }
  }
}
