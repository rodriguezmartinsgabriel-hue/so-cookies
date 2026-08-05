import { randomUUID } from "crypto"
import { mpAccessToken } from "./config"
import { PaymentError } from "./errors"

const API_BASE = "https://api.mercadopago.com"

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
  const res = await fetch(`${API_BASE}/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${mpAccessToken()}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": randomUUID(),
    },
    body: JSON.stringify({
      transaction_amount: input.transactionAmount,
      description: input.description,
      payment_method_id: "pix",
      payer: { email: input.payerEmail },
      external_reference: input.externalReference,
      date_of_expiration: input.expiresAt.toISOString(),
      ...(input.notificationUrl ? { notification_url: input.notificationUrl } : {}),
    }),
  })
  const json = await res.json()
  if (!res.ok) {
    throw new PaymentError("PROVIDER_ERROR", `Mercado Pago falhou ao criar pagamento (${res.status})`)
  }
  const tx = json?.point_of_interaction?.transaction_data
  if (!tx?.qr_code || !tx?.qr_code_base64) {
    throw new PaymentError("PROVIDER_ERROR", "Mercado Pago não retornou os dados do PIX")
  }
  return {
    id: json.id,
    status: json.status,
    qrCode: tx.qr_code,
    qrCodeBase64: tx.qr_code_base64,
  }
}

export async function getPixPayment(paymentId: string): Promise<MercadoPagoPixPayment> {
  const res = await fetch(`${API_BASE}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${mpAccessToken()}` },
  })
  if (!res.ok) {
    throw new PaymentError("PROVIDER_ERROR", `Mercado Pago falhou ao consultar pagamento (${res.status})`)
  }
  return res.json() as Promise<MercadoPagoPixPayment>
}
