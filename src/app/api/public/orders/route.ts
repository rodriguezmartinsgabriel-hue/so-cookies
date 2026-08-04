import { NextResponse } from "next/server"
import { requireCustomer } from "@/lib/customer-auth"
import { createCustomerOrder, getCustomerOrders } from "@/lib/customer-orders"
import { createCustomerOrderSchema, getZodIssues } from "@/lib/validation"
import { SlotError } from "@/lib/delivery-scheduling"
import { rateLimit } from "@/lib/rate-limit"

export async function GET() {
  const { error, customer } = await requireCustomer()
  if (error) return error
  try {
    const orders = await getCustomerOrders(customer.id)
    return NextResponse.json(orders)
  } catch {
    return NextResponse.json({ error: "Erro ao buscar pedidos" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const limited = rateLimit(request, 20, 60_000)
  if (!limited.ok) {
    return NextResponse.json({ error: "Muitas tentativas. Tente novamente em instantes." }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } })
  }
  const { error, customer } = await requireCustomer()
  if (error) return error
  try {
    const json = await request.json()
    const parsed = createCustomerOrderSchema.parse(json)
    const order = await createCustomerOrder(customer.id, parsed)
    return NextResponse.json(order, { status: 201 })
  } catch (e) {
    const issues = getZodIssues(e)
    if (issues) {
      return NextResponse.json({ error: "Dados inválidos", details: issues }, { status: 400 })
    }
    if (e instanceof SlotError) {
      const status = e.code === "NOT_FOUND" ? 404 : 409
      return NextResponse.json({ error: e.message, code: e.code }, { status })
    }
    return NextResponse.json({ error: "Erro ao criar pedido" }, { status: 500 })
  }
}
