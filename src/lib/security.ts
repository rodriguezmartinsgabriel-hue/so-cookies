export const ALLOWED_ORIGINS: ReadonlySet<string> = new Set([
  "https://cookiesecafes.com",
  "https://www.cookiesecafes.com",
  "https://app.cookiesecafes.com",
  "http://localhost:3000",
])

export function isAllowedOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false
  try {
    return ALLOWED_ORIGINS.has(new URL(origin).origin)
  } catch {
    return false
  }
}
