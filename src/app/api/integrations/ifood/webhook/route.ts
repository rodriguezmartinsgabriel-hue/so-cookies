import { NextResponse } from "next/server"
import { findIfoodAccountBySignature, is99FoodCredentials } from "@/lib/integrations/accounts"
import { processInboundOrderEvent } from "@/lib/integrations/events"
import { ifoodWebhookSchema, isBodyTooLarge } from "@/lib/integrations/schemas"

export async function POST(request: Request) {
  const raw = await request.text()
  if (isBodyTooLarge(request, raw)) {
    return new NextResponse(null, { status: 413 })
  }

  const signature = request.headers.get("X-IFood-Signature")

  const account = await findIfoodAccountBySignature(raw, signature)
  if (!account || is99FoodCredentials(account.credentials)) {
    return new NextResponse(null, { status: 401 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    return new NextResponse(null, { status: 400 })
  }

  const parsed = ifoodWebhookSchema.safeParse(payload)
  if (!parsed.success) {
    return new NextResponse(null, { status: 400 })
  }

  if (parsed.data.code === "presence") {
    return new NextResponse(null, { status: 200 })
  }

  try {
    await processInboundOrderEvent({
      platform: "IFOOD",
      account,
      event: {
        eventId: String(parsed.data.id),
        eventType: String(parsed.data.code || "order/requests/create"),
        orderId: String(parsed.data.orderId),
        createdAt: parsed.data.createdAt,
      },
    })
  } catch {
    return new NextResponse(null, { status: 500 })
  }

  return new NextResponse(null, { status: 200 })
}
