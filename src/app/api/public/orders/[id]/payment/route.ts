import { NextResponse } from "next/server"
import { requireCustomer } from "@/lib/customer-auth"
import { retryCustomerOrderPayment } from "@/lib/customer-orders"
import { SlotError } from "@/lib/delivery-scheduling"
import { PaymentError } from "@/lib/payments/errors"
import { rateLimit } from "@/lib/rate-limit"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, customer } = await requireCustomer()
  if (error) return error
  const limited = rateLimit(request, 10, 60_000)
  if (!limited.ok) {
    return NextResponse.json({ error: "Muitas tentativas. Tente novamente em instantes." }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } })
  }
  try {
    const { id } = await params
    const order = await retryCustomerOrderPayment(customer.id, id)
    return NextResponse.json(order)
  } catch (e) {
    if (e instanceof PaymentError) {
      const status = e.code === "PAYMENTS_DISABLED" ? 503 : 400
      return NextResponse.json({ error: e.message, code: e.code }, { status })
    }
    if (e instanceof SlotError) {
      const status = e.code === "NOT_FOUND" ? 404 : 409
      return NextResponse.json({ error: e.message, code: e.code }, { status })
    }
    return NextResponse.json({ error: "Não foi possível gerar um novo pagamento" }, { status: 500 })
  }
}
