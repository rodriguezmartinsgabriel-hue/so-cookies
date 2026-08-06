import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { isNotFoundError, updateCashEntry } from "@/lib/db"
import { recordSyncDelete } from "@/lib/sync-deletes"
import { updateCashFlowSchema, getZodIssues } from "@/lib/validation"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(request)
  if (error) return error
  try {
    const { id } = await params
    const data = await prisma.cashFlow.findUnique({ where: { id } })
    if (!data) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Erro ao buscar entrada" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(request, "ADMIN")
  if (error) return error
  try {
    const { id } = await params
    const json = await request.json()
    const parsed = updateCashFlowSchema.parse(json)
    const data = await updateCashEntry(id, parsed)
    return NextResponse.json(data)
  } catch (e) {
    const issues = getZodIssues(e)
    if (issues) return NextResponse.json({ error: "Dados inválidos", details: issues }, { status: 400 })
    return NextResponse.json({ error: "Erro ao atualizar entrada" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(request, "ADMIN")
  if (error) return error
  try {
    const { id } = await params
    await prisma.cashFlow.delete({ where: { id } })
    await recordSyncDelete("cashFlow", id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (isNotFoundError(e)) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    return NextResponse.json({ error: "Erro ao deletar entrada" }, { status: 500 })
  }
}
