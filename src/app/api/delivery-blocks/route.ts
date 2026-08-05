import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { deliveryBlockSchema, getZodIssues } from "@/lib/validation"

export async function GET(request: Request) {
  const { error } = await requireAuth(request)
  if (error) return error
  try {
    const blocks = await prisma.deliveryBlockedDate.findMany({
      orderBy: { date: "desc" },
      include: { zone: { select: { id: true, name: true } } },
    })
    return NextResponse.json(blocks)
  } catch {
    return NextResponse.json({ error: "Erro ao buscar bloqueios" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { error } = await requireAuth(request, "ADMIN")
  if (error) return error
  try {
    const json = await request.json()
    const parsed = deliveryBlockSchema.parse(json)
    const block = await prisma.deliveryBlockedDate.create({
      data: {
        zoneId: parsed.zoneId,
        date: new Date(`${parsed.date}T00:00:00.000Z`),
        reason: parsed.reason ?? null,
      },
      include: { zone: { select: { id: true, name: true } } },
    })
    return NextResponse.json(block, { status: 201 })
  } catch (e) {
    const issues = getZodIssues(e)
    if (issues) return NextResponse.json({ error: "Dados inválidos", details: issues }, { status: 400 })
    return NextResponse.json({ error: "Erro ao criar bloqueio" }, { status: 500 })
  }
}
