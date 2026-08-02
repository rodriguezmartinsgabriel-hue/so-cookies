import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { createCashFlowSchema, getZodIssues } from "@/lib/validation"

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error
  try {
    const data = await prisma.cashFlow.findMany({ orderBy: { date: "desc" } })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Erro ao buscar fluxo de caixa" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { error } = await requireAuth("ADMIN")
  if (error) return error
  try {
    const json = await request.json()
    const parsed = createCashFlowSchema.parse(json)
    const { description, ...rest } = parsed
    const data = await prisma.cashFlow.create({
      data: { ...rest, description: (description ?? "").trim() || "Sem descrição" },
    })
    return NextResponse.json(data)
  } catch (e) {
    const issues = getZodIssues(e)
    if (issues) {
      return NextResponse.json({ error: "Dados inválidos", details: issues }, { status: 400 })
    }
    return NextResponse.json({ error: "Erro ao criar entrada" }, { status: 500 })
  }
}
