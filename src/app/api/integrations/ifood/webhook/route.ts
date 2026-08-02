import { NextResponse } from "next/server"
import { findIfoodAccountBySignature, is99FoodCredentials } from "@/lib/integrations/accounts"
import { processInboundOrderEvent } from "@/lib/integrations/events"

export async function POST(request: Request) {
  const raw = await request.text()
  const signature = request.headers.get("X-IFood-Signature")

  const account = await findIfoodAccountBySignature(raw, signature)
  if (!account || is99FoodCredentials(account.credentials)) {
    return new NextResponse(null, { status: 401 })
  }

  type WebhookEvent = {
    code?: unknown
    id?: unknown
    orderId?: unknown
    createdAt?: unknown
  }

  let payload: WebhookEvent
  try {
    payload = JSON.parse(raw) as WebhookEvent
  } catch {
    return new NextResponse(null, { status: 400 })
  }

  if (payload?.code === "presence") {
    return new NextResponse(null, { status: 200 })
  }

  if (!payload?.id || !payload?.orderId) {
    return new NextResponse(null, { status: 400 })
  }

  try {
    await processInboundOrderEvent({
      platform: "IFOOD",
      account,
      event: {
        eventId: String(payload.id),
        eventType: String(payload.code || "order/requests/create"),
        orderId: String(payload.orderId),
        createdAt: typeof payload.createdAt === "string" ? payload.createdAt : undefined,
      },
    })
  } catch {
    return new NextResponse(null, { status: 500 })
  }

  return new NextResponse(null, { status: 200 })
}
