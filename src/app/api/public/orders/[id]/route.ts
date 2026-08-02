import { NextResponse } from "next/server"
import { requireCustomer } from "@/lib/customer-auth"
import { getCustomerOrder } from "@/lib/customer-orders"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, customer } = await requireCustomer()
  if (error) return error
  try {
    const { id } = await params
    const order = await getCustomerOrder(customer.id, id)
    if (!order) return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 })
    return NextResponse.json(order)
  } catch {
    return NextResponse.json({ error: "Erro ao buscar pedido" }, { status: 500 })
  }
}
