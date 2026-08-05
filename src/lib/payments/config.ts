export const PAYMENT_PROVIDER = "MERCADO_PAGO"
export const PAYMENT_TTL_MS = 30 * 60 * 1000

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
  return Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN)
}
