import { randomUUID } from "crypto"
import { mpAccessToken } from "./config"
import { PaymentError } from "./errors"
import { logger } from "../logger"

const API_BASE = "https://api.mercadopago.com"
const FETCH_TIMEOUT_MS = 10_000
const MAX_RETRIES = 3
const RETRY_BASE_DELAY_MS = 1_000

class MpRetryableError extends Error {}

async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  let lastError: unknown
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })
      if (res.ok) return res
      if (res.status === 401 || res.status === 403) {
        throw new PaymentError("PROVIDER_AUTH_ERROR", `Mercado Pago rejeitou autenticação (HTTP ${res.status})`)
      }
      if (res.status >= 400 && res.status < 500 && res.status !== 404) {
        throw new PaymentError("PROVIDER_ERROR", `Mercado Pago recusou requisição (HTTP ${res.status})`)
      }
      if (res.status === 404) {
        throw new PaymentError("PAYMENT_NOT_FOUND", "Pagamento não encontrado no Mercado Pago")
      }
      lastError = new MpRetryableError(`HTTP ${res.status}`)
    } catch (err) {
      if (err instanceof PaymentError) throw err
      lastError = err
      if (err instanceof Error && err.name === "TimeoutError") {
        logger.warn("[payments] timeout ao comunicar com Mercado Pago", { attempt, url: url.replace(API_BASE, "") })
      }
    }
    if (attempt < MAX_RETRIES) {
      const delay = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1)
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw new PaymentError("PROVIDER_ERROR", `Mercado Pago indisponível após ${MAX_RETRIES} tentativas: ${lastError instanceof Error ? lastError.message : "erro desconhecido"}`)
}

export type MercadoPagoPixPayment = {
  id: number
  status: string
  status_detail: string | null
  transaction_amount: number
  external_reference: string | null
  payer: { email: string }
  point_of_interaction?: {
    transaction_data?: {
      qr_code: string
      qr_code_base64: string
      ticket_url?: string
    }
  }
}

export type CreatePixPaymentInput = {
  transactionAmount: number
  description: string
  payerEmail: string
  externalReference: string
  notificationUrl: string | null
  expiresAt: Date
}

export type CreatePixPaymentResult = {
  id: number
  status: string
  qrCode: string
  qrCodeBase64: string
}

export async function createPixPayment(input: CreatePixPaymentInput): Promise<CreatePixPaymentResult> {
  const body = {
    transaction_amount: input.transactionAmount,
    description: input.description,
    payment_method_id: "pix",
    payer: { email: input.payerEmail },
    external_reference: input.externalReference,
    date_of_expiration: input.expiresAt.toISOString(),
    ...(input.notificationUrl ? { notification_url: input.notificationUrl } : {}),
  }
  const res = await fetchWithRetry(`${API_BASE}/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${mpAccessToken()}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": randomUUID(),
    },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  const tx = json?.point_of_interaction?.transaction_data
  if (!tx?.qr_code || !tx?.qr_code_base64) {
    logger.error("[payments] Mercado Pago não retornou dados do PIX", {
      paymentId: json?.id,
      status: json?.status,
      hasPointOfInteraction: Boolean(json?.point_of_interaction),
    })
    throw new PaymentError("PROVIDER_ERROR", "Mercado Pago não retornou os dados do PIX")
  }
  logger.info("[payments] PIX criado com sucesso", {
    paymentId: json.id,
    externalReference: input.externalReference,
  })
  return {
    id: json.id,
    status: json.status,
    qrCode: tx.qr_code,
    qrCodeBase64: tx.qr_code_base64,
  }
}

export async function getPixPayment(paymentId: string): Promise<MercadoPagoPixPayment> {
  const res = await fetchWithRetry(`${API_BASE}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${mpAccessToken()}` },
  })
  return res.json() as Promise<MercadoPagoPixPayment>
}
