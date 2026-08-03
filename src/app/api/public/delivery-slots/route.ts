import { NextResponse } from "next/server"
import { getDeliverySlots } from "@/lib/delivery-scheduling"
import { requireCustomer } from "@/lib/customer-auth"
import { rateLimit } from "@/lib/rate-limit"

export async function GET(request: Request) {
  const { error } = await requireCustomer()
  if (error) return error
  const limited = rateLimit(request, 60, 60_000)
  if (!limited.ok) {
    return NextResponse.json({ error: "Muitas tentativas. Tente novamente em instantes." }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } })
  }
  try {
    const url = new URL(request.url)
    const zoneId = url.searchParams.get("zoneId") || undefined
    const slots = await getDeliverySlots({ zoneId })
    return NextResponse.json({ slots })
  } catch {
    return NextResponse.json({ error: "Erro ao buscar opções de entrega" }, { status: 500 })
  }
}
