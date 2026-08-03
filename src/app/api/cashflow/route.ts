import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { createCashEntry } from "@/lib/db"
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
    const data = await createCashEntry({
      type: parsed.type,
      category: parsed.category,
      description: (parsed.description ?? "").trim() || "Sem descrição",
      amount: parsed.amount,
      userId: parsed.userId,
      date: parsed.date,
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
