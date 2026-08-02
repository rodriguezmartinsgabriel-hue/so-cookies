import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"
import { deleteContactInteraction, isNotFoundError } from "@/lib/db"
import { recordSyncDelete } from "@/lib/sync-deletes"

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth("OPERACIONAL")
  if (error) return error
  try {
    const { id } = await params
    await deleteContactInteraction(id)
    await recordSyncDelete("contactInteraction", id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (isNotFoundError(e)) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    return NextResponse.json({ error: "Erro ao excluir interação" }, { status: 500 })
  }
}
