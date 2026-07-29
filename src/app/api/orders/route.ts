import { NextResponse } from "next/server"
import { getOrders, createOrder } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"
import { createOrderSchema } from "@/lib/validation"

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error
  const orders = await getOrders()
  return NextResponse.json(orders)
}

export async function POST(request: Request) {
  const { error } = await requireAuth("OPERACIONAL")
  if (error) return error
  try {
    const json = await request.json()
    const parsed = createOrderSchema.parse(json)
    const order = await createOrder(parsed)
    return NextResponse.json(order)
  } catch (e: any) {
    if (e?.issues) {
      return NextResponse.json({ error: "Dados inválidos", details: e.issues }, { status: 400 })
    }
    return NextResponse.json({ error: "Erro ao criar pedido" }, { status: 500 })
  }
}
