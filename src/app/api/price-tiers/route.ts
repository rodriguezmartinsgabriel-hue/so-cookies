import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { createPriceTierSchema, getZodIssues } from "@/lib/validation"

export async function GET(request: Request) {
  const { error } = await requireAuth(request)
  if (error) return error
  try {
    const tiers = await prisma.priceTier.findMany()
    return NextResponse.json(tiers)
  } catch {
    return NextResponse.json({ error: "Erro ao buscar faixas de preço" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { error } = await requireAuth(request, "ADMIN")
  if (error) return error
  try {
    const json = await request.json()
    const parsed = createPriceTierSchema.parse(json)
    const tier = await prisma.priceTier.create({ data: parsed })
    return NextResponse.json(tier)
  } catch (e) {
    const issues = getZodIssues(e)
    if (issues) {
      return NextResponse.json({ error: "Dados inválidos", details: issues }, { status: 400 })
    }
    return NextResponse.json({ error: "Erro ao criar faixa de preço" }, { status: 500 })
  }
}
