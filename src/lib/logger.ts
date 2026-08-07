export type LogLevel = "debug" | "info" | "warn" | "error"

export type LogMeta = Record<string, unknown>

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

const isServer = typeof window === "undefined"
const isProd = process.env.NODE_ENV === "production"

function prefix(level: LogLevel): string {
  const scope = isServer ? "server" : "client"
  return `[so-manager:${scope}] [${level.toUpperCase()}] ${new Date().toISOString()}`
}

function formatMeta(meta?: LogMeta): string {
  if (!meta) return ""
  const entries = Object.entries(meta).filter(([, value]) => value !== undefined)
  if (entries.length === 0) return ""
  try {
    return ` ${JSON.stringify(Object.fromEntries(entries))}`
  } catch {
    return ""
  }
}

function formatError(error?: unknown): string {
  if (error === undefined || error === null) return ""
  if (error instanceof Error) {
    return `\n  Error: ${error.message}\n  Stack: ${error.stack ?? "sem stack"}`
  }
  try {
    return `\n  Detalhes: ${JSON.stringify(error)}`
  } catch {
    return `\n  Detalhes: ${String(error)}`
  }
}

function write(level: LogLevel, message: string, meta?: LogMeta, error?: unknown): void {
  if (isProd && LEVEL_WEIGHT[level] < LEVEL_WEIGHT.warn) return
  const line = `${prefix(level)} ${message}${formatMeta(meta)}${formatError(error)}`
  switch (level) {
    case "debug":
      console.debug(line)
      break
    case "info":
      console.log(line)
      break
    case "warn":
      console.warn(line)
      break
    case "error":
      console.error(line)
      break
  }
}

export const logger = {
  debug(message: string, meta?: LogMeta): void {
    write("debug", message, meta)
  },
  info(message: string, meta?: LogMeta): void {
    write("info", message, meta)
  },
  warn(message: string, meta?: LogMeta, error?: unknown): void {
    write("warn", message, meta, error)
  },
  error(message: string, meta?: LogMeta, error?: unknown): void {
    write("error", message, meta, error)
  },
}
