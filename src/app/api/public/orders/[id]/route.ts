import { NextResponse } from "next/server"
import { requireCustomer } from "@/lib/customer-auth"
import { getCustomerOrder, updateCustomerOrder } from "@/lib/customer-orders"
import { updateCustomerOrderSchema, getZodIssues } from "@/lib/validation"
import { SlotError } from "@/lib/delivery-scheduling"
import { expireUnpaidOrders } from "@/lib/payments/service"
import { rateLimit } from "@/lib/rate-limit"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, customer } = await requireCustomer()
  if (error) return error
  try {
    const { id } = await params
    let order = await getCustomerOrder(customer.id, id)
    if (!order) return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 })

    if (
      order.paymentStatus === "AGUARDANDO_PAGAMENTO" &&
      order.status === "PENDENTE" &&
      order.paymentExpiresAt &&
      order.paymentExpiresAt.getTime() < Date.now()
    ) {
      await expireUnpaidOrders()
      order = await getCustomerOrder(customer.id, id)
    }

    return NextResponse.json(order)
  } catch {
    return NextResponse.json({ error: "Erro ao buscar pedido" }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, customer } = await requireCustomer()
  if (error) return error
  const limited = rateLimit(request, 20, 60_000)
  if (!limited.ok) {
    return NextResponse.json({ error: "Muitas tentativas. Tente novamente em instantes." }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } })
  }
  try {
    const { id } = await params
    const json = await request.json()
    const parsed = updateCustomerOrderSchema.parse(json)
    const order = await updateCustomerOrder(customer.id, id, parsed)
    return NextResponse.json(order)
  } catch (e) {
    const issues = getZodIssues(e)
    if (issues) {
      return NextResponse.json({ error: "Dados inválidos", details: issues }, { status: 400 })
    }
    if (e instanceof SlotError) {
      const status = e.code === "NOT_FOUND" ? 404 : 400
      return NextResponse.json({ error: e.message, code: e.code }, { status })
    }
    return NextResponse.json({ error: "Erro ao atualizar pedido" }, { status: 500 })
  }
}
