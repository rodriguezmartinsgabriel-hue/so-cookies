import { NextResponse } from "next/server"
import { getSales, createSale } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"
import { createSaleSchema, getZodIssues } from "@/lib/validation"

export async function GET(request: Request) {
  const { error } = await requireAuth(request)
  if (error) return error

  try {
    const sales = await getSales()
    return NextResponse.json(sales)
  } catch {
    return NextResponse.json({ error: "Erro ao listar vendas" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { error } = await requireAuth(request, "OPERACIONAL")
  if (error) return error
  try {
    const json = await request.json()
    const parsed = createSaleSchema.parse(json)
    const sale = await createSale(parsed)
    return NextResponse.json(sale)
  } catch (e) {
    const issues = getZodIssues(e)
    if (issues) {
      return NextResponse.json({ error: "Dados inválidos", details: issues }, { status: 400 })
    }
    return NextResponse.json({ error: "Erro ao criar venda" }, { status: 500 })
  }
}
