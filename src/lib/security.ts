const DEFAULT_ORIGINS = [
  "https://cookiesecafes.com",
  "https://www.cookiesecafes.com",
  "https://app.cookiesecafes.com",
  "http://localhost:3000",
]

function buildAllowedOrigins(): ReadonlySet<string> {
  const override = process.env.ALLOWED_ORIGINS
  if (override && override.trim() !== "") {
    return new Set(
      override
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    )
  }
  return new Set(DEFAULT_ORIGINS)
}

export const ALLOWED_ORIGINS: ReadonlySet<string> = buildAllowedOrigins()

export function isAllowedOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false
  try {
    return ALLOWED_ORIGINS.has(new URL(origin).origin)
  } catch {
    return false
  }
}
