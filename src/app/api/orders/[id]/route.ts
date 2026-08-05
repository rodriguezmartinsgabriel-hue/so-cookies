import { NextResponse } from "next/server"
import { getOrder, applyOrderUpdate, deleteOrder, isNotFoundError } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"
import { recordSyncDelete } from "@/lib/sync-deletes"
import { updateOrderSchema, getZodIssues } from "@/lib/validation"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth(request)
  if (error) return error
  try {
    const { id } = await params
    const order = await getOrder(id)
    if (!order) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    return NextResponse.json(order)
  } catch {
    return NextResponse.json({ error: "Erro ao buscar pedido" }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth(request, "OPERACIONAL")
  if (error) return error
  try {
    const { id } = await params
    const json = await request.json()
    const parsed = updateOrderSchema.parse(json)
    const order = await applyOrderUpdate(id, parsed)
    return NextResponse.json(order)
  } catch (e) {
    const issues = getZodIssues(e)
    if (issues) return NextResponse.json({ error: "Dados inválidos", details: issues }, { status: 400 })
    return NextResponse.json({ error: "Erro ao atualizar pedido" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth(request, "OPERACIONAL")
  if (error) return error
  try {
    const { id } = await params
    await deleteOrder(id)
    await recordSyncDelete("order", id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (isNotFoundError(e)) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    return NextResponse.json({ error: "Erro ao deletar pedido" }, { status: 500 })
  }
}
