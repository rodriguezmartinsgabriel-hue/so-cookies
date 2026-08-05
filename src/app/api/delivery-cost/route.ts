import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { createDeliveryCostSchema, getZodIssues } from "@/lib/validation"

export async function GET(request: Request) {
  const { error } = await requireAuth(request)
  if (error) return error
  try {
    const costs = await prisma.deliveryCost.findMany()
    return NextResponse.json(costs)
  } catch {
    return NextResponse.json({ error: "Erro ao buscar custos de entrega" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { error } = await requireAuth(request, "OPERACIONAL")
  if (error) return error
  try {
    const json = await request.json()
    const parsed = createDeliveryCostSchema.parse(json)
    const cost = await prisma.deliveryCost.create({ data: parsed })
    return NextResponse.json(cost)
  } catch (e) {
    const issues = getZodIssues(e)
    if (issues) {
      return NextResponse.json({ error: "Dados inválidos", details: issues }, { status: 400 })
    }
    return NextResponse.json({ error: "Erro ao criar custo de entrega" }, { status: 500 })
  }
}
