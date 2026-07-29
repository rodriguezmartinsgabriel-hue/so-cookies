import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { createProductionSchema } from "@/lib/validation"

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error
  try {
    const data = await prisma.production.findMany({ include: { product: true }, orderBy: { startTime: "desc" } })
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: "Erro ao buscar produções" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { error } = await requireAuth("OPERACIONAL")
  if (error) return error
  try {
    const json = await request.json()
    const parsed = createProductionSchema.parse(json)
    const data = await prisma.production.create({ data: parsed, include: { product: true } })
    return NextResponse.json(data)
  } catch (e: any) {
    if (e?.issues) {
      return NextResponse.json({ error: "Dados inválidos", details: e.issues }, { status: 400 })
    }
    return NextResponse.json({ error: "Erro ao criar produção" }, { status: 500 })
  }
}
