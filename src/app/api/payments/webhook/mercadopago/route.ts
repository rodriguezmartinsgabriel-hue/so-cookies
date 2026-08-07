import { NextResponse } from "next/server"
import { verifyWebhookSignature } from "@/lib/payments/webhook"
import { handlePaymentWebhook } from "@/lib/payments/service"
import { mpWebhookSecret } from "@/lib/payments/config"
import { logger } from "@/lib/logger"

export async function POST(request: Request) {
  const searchParams = new URL(request.url).searchParams
  const dataId = searchParams.get("data.id")
  const type = searchParams.get("type")
  const xSignature = request.headers.get("x-signature")
  const xRequestId = request.headers.get("x-request-id")

  const valid = verifyWebhookSignature({
    secret: mpWebhookSecret(),
    xSignature,
    xRequestId,
    dataId,
  })
  if (!valid) {
    logger.warn("[webhook] assinatura inválida rejeitada", { dataId, hasSignature: Boolean(xSignature) })
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 })
  }

  if (type !== "payment" || !dataId) {
    return NextResponse.json({ ok: true })
  }

  try {
    await handlePaymentWebhook({ paymentId: dataId })
  } catch (error) {
    logger.error("[webhook] erro ao processar", { paymentId: dataId }, error)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: true })
}
