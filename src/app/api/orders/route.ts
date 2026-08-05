import { NextResponse } from "next/server"
import { getOrders, createOrder } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"
import { createOrderSchema, getZodIssues } from "@/lib/validation"

export async function GET(request: Request) {
  const { error } = await requireAuth(request)
  if (error) return error

  try {
    const orders = await getOrders()
    return NextResponse.json(orders)
  } catch {
    return NextResponse.json({ error: "Erro ao listar pedidos" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { error } = await requireAuth(request, "OPERACIONAL")
  if (error) return error
  try {
    const json = await request.json()
    const parsed = createOrderSchema.parse(json)
    const order = await createOrder(parsed)
    return NextResponse.json(order)
  } catch (e) {
    const issues = getZodIssues(e)
    if (issues) {
      return NextResponse.json({ error: "Dados inválidos", details: issues }, { status: 400 })
    }
    return NextResponse.json({ error: "Erro ao criar pedido" }, { status: 500 })
  }
}
