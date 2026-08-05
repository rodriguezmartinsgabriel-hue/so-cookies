import { NextResponse } from "next/server"
import { verifyWebhookSignature, diagnoseWebhookSignature } from "@/lib/payments/webhook"
import { handlePaymentWebhook } from "@/lib/payments/service"
import { mpWebhookSecret } from "@/lib/payments/config"

export async function POST(request: Request) {
  const searchParams = new URL(request.url).searchParams
  const dataId = searchParams.get("data.id")
  const type = searchParams.get("type")
  const xSignature = request.headers.get("x-signature")
  const xRequestId = request.headers.get("x-request-id")

  const secret = mpWebhookSecret()
  const valid = verifyWebhookSignature({
    secret,
    xSignature,
    xRequestId,
    dataId,
  })
  if (!valid) {
    return NextResponse.json(
      {
        error: "Assinatura inválida",
        debug: diagnoseWebhookSignature({ secret, xSignature, xRequestId, dataId }),
      },
      { status: 401 },
    )
  }

  if (type !== "payment" || !dataId) {
    return NextResponse.json({ ok: true })
  }

  try {
    await handlePaymentWebhook({ paymentId: dataId })
  } catch (error) {
    console.error("[webhook] erro ao processar", error)
    return NextResponse.json({ error: "Erro ao processar webhook" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
