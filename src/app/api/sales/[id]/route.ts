import { NextResponse } from "next/server"
import { getSale, deleteSale, isNotFoundError } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"
import { recordSyncDelete } from "@/lib/sync-deletes"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth(request)
  if (error) return error
  try {
    const { id } = await params
    const sale = await getSale(id)
    if (!sale) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    return NextResponse.json(sale)
  } catch {
    return NextResponse.json({ error: "Erro ao buscar venda" }, { status: 500 })
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
    await deleteSale(id)
    await recordSyncDelete("sale", id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (isNotFoundError(e)) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    return NextResponse.json({ error: "Erro ao deletar venda" }, { status: 500 })
  }
}
