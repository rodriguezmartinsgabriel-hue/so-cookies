import { NextResponse } from "next/server"
import { find99FoodAccountByMerchant, is99FoodCredentials } from "@/lib/integrations/accounts"
import { processInboundOrderEvent } from "@/lib/integrations/events"
import { verifyHmacSha256 } from "@/lib/integrations/signature"
import { isBodyTooLarge, ninentyNineFoodWebhookSchema } from "@/lib/integrations/schemas"

export async function POST(request: Request) {
  const raw = await request.text()
  if (isBodyTooLarge(request, raw)) {
    return new NextResponse(null, { status: 413 })
  }

  const appId = request.headers.get("x-app-id")
  const shoppId = request.headers.get("x-app-shopp-id") || request.headers.get("x-app-merchantid")
  const signature = request.headers.get("x-app-signature")

  if (!appId || !shoppId || !signature) {
    return new NextResponse(null, { status: 403 })
  }

  const account = await find99FoodAccountByMerchant(shoppId)
  if (!account || !is99FoodCredentials(account.credentials)) {
    return new NextResponse(null, { status: 404 })
  }

  if (!verifyHmacSha256(raw, account.credentials.clientSecret, signature)) {
    return new NextResponse(null, { status: 403 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    return new NextResponse(null, { status: 400 })
  }

  const parsed = ninentyNineFoodWebhookSchema.safeParse(payload)
  if (!parsed.success) {
    return new NextResponse(null, { status: 400 })
  }

  try {
    await processInboundOrderEvent({
      platform: "99FOOD",
      account,
      event: {
        eventId: String(parsed.data.eventId),
        eventType: String(parsed.data.eventType),
        orderId: String(parsed.data.orderId),
        orderUrl: parsed.data.orderURL,
        createdAt: parsed.data.createdAt,
      },
    })
  } catch {
    return new NextResponse(null, { status: 500 })
  }

  return new NextResponse(null, { status: 200 })
}
