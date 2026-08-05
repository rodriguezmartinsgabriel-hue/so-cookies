import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { createProductionSchema, getZodIssues } from "@/lib/validation"

export async function GET(request: Request) {
  const { error } = await requireAuth(request)
  if (error) return error
  try {
    const data = await prisma.production.findMany({ include: { product: true }, orderBy: { startTime: "desc" } })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Erro ao buscar produções" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { error } = await requireAuth(request, "OPERACIONAL")
  if (error) return error
  try {
    const json = await request.json()
    const parsed = createProductionSchema.parse(json)
    const data = await prisma.production.create({ data: parsed, include: { product: true } })
    return NextResponse.json(data)
  } catch (e) {
    const issues = getZodIssues(e)
    if (issues) {
      return NextResponse.json({ error: "Dados inválidos", details: issues }, { status: 400 })
    }
    return NextResponse.json({ error: "Erro ao criar produção" }, { status: 500 })
  }
}
