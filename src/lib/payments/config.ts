import { logger } from "../logger"

export const PAYMENT_PROVIDER = "MERCADO_PAGO"
export const PAYMENT_TTL_MS = 30 * 60 * 1000
export const MIN_TRANSACTION_AMOUNT = 0.01
export const MAX_TRANSACTION_AMOUNT = 100_000

export function mpAccessToken(): string {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN
  if (!token) throw new Error("MERCADO_PAGO_ACCESS_TOKEN não configurado no servidor")
  return token
}

export function mpWebhookSecret(): string | null {
  return process.env.MERCADO_PAGO_WEBHOOK_SECRET || null
}

export function mpNotificationUrl(): string | null {
  return process.env.MERCADO_PAGO_NOTIFICATION_URL || null
}

export function isMercadoPagoConfigured(): boolean {
  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) return false
  if (process.env.NODE_ENV === "production") {
    return Boolean(
      process.env.MERCADO_PAGO_WEBHOOK_SECRET && process.env.MERCADO_PAGO_NOTIFICATION_URL,
    )
  }
  return true
}

let lastConfigWarningsAt = 0
const CONFIG_WARNINGS_INTERVAL_MS = 5 * 60 * 1000

export function logPaymentConfigWarnings(): void {
  const now = Date.now()
  if (now - lastConfigWarningsAt < CONFIG_WARNINGS_INTERVAL_MS) return
  lastConfigWarningsAt = now

  if (!process.env.MERCADO_PAGO_WEBHOOK_SECRET) {
    logger.warn("[payments] MERCADO_PAGO_WEBHOOK_SECRET não configurada — webhooks serão rejeitados")
  }
  if (!process.env.MERCADO_PAGO_NOTIFICATION_URL) {
    logger.warn("[payments] MERCADO_PAGO_NOTIFICATION_URL não configurada — pagamentos não serão confirmados automaticamente via webhook")
  }
}
