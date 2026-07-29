import { NextResponse } from "next/server"
import { getSales, createSale } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"
import { createSaleSchema } from "@/lib/validation"

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error
  const sales = await getSales()
  return NextResponse.json(sales)
}

export async function POST(request: Request) {
  const { error } = await requireAuth()
  if (error) return error
  try {
    const json = await request.json()
    const parsed = createSaleSchema.parse(json)
    const sale = await createSale(parsed)
    return NextResponse.json(sale)
  } catch (e: any) {
    if (e?.issues) {
      return NextResponse.json({ error: "Dados inválidos", details: e.issues }, { status: 400 })
    }
    return NextResponse.json({ error: "Erro ao criar venda" }, { status: 500 })
  }
}
