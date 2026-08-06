import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { isNotFoundError } from "@/lib/db"
import { recordSyncDelete } from "@/lib/sync-deletes"
import { updateDeliveryCostSchema, getZodIssues } from "@/lib/validation"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(request, "OPERACIONAL")
  if (error) return error
  try {
    const { id } = await params
    const json = await request.json()
    const parsed = updateDeliveryCostSchema.parse(json)
    const cost = await prisma.deliveryCost.update({ where: { id }, data: parsed })
    return NextResponse.json(cost)
  } catch (e) {
    const issues = getZodIssues(e)
    if (issues) return NextResponse.json({ error: "Dados inválidos", details: issues }, { status: 400 })
    return NextResponse.json({ error: "Erro ao atualizar custo de entrega" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(request, "OPERACIONAL")
  if (error) return error
  try {
    const { id } = await params
    await prisma.deliveryCost.delete({ where: { id } })
    await recordSyncDelete("deliveryCost", id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (isNotFoundError(e)) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    return NextResponse.json({ error: "Erro ao deletar custo de entrega" }, { status: 500 })
  }
}
