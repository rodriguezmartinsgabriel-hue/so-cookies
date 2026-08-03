import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error
  try {
    const data = await prisma.ingredient.findMany()
    const lowStock = data.filter((i) => i.stockKg <= i.minStockKg)
    return NextResponse.json(lowStock)
  } catch {
    return NextResponse.json({ error: "Erro ao buscar estoque baixo" }, { status: 500 })
  }
}
