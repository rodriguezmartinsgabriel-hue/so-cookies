import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { createDeliveryCostSchema } from "@/lib/validation"

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error
  try {
    const costs = await prisma.deliveryCost.findMany()
    return NextResponse.json(costs)
  } catch (e) {
    return NextResponse.json({ error: "Erro ao buscar custos de entrega" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { error } = await requireAuth("OPERACIONAL")
  if (error) return error
  try {
    const json = await request.json()
    const parsed = createDeliveryCostSchema.parse(json)
    const cost = await prisma.deliveryCost.create({ data: parsed })
    return NextResponse.json(cost)
  } catch (e: any) {
    if (e?.issues) {
      return NextResponse.json({ error: "Dados inválidos", details: e.issues }, { status: 400 })
    }
    return NextResponse.json({ error: "Erro ao criar custo de entrega" }, { status: 500 })
  }
}
