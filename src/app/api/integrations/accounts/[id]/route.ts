import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"
import { updateAccount, deleteAccount } from "@/lib/integrations/accounts"
import { accountUpdateSchema } from "@/lib/integrations/validation"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAuth("ADMIN")
  if (error) return error
  try {
    const { id } = await params
    const json = await request.json()
    const parsed = accountUpdateSchema.parse(json)
    const updated = await updateAccount(id, parsed)
    return NextResponse.json(updated)
  } catch (e: any) {
    if (e?.issues) {
      return NextResponse.json({ error: "Dados inválidos", details: e.issues }, { status: 400 })
    }
    if (e?.code === "P2025") {
      return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 })
    }
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "Já existe uma conta com esse nome de loja nesta plataforma" }, { status: 409 })
    }
    return NextResponse.json({ error: "Erro ao atualizar conta" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAuth("ADMIN")
  if (error) return error
  try {
    const { id } = await params
    await deleteAccount(id)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e?.code === "P2025") {
      return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 })
    }
    return NextResponse.json({ error: "Erro ao excluir conta" }, { status: 500 })
  }
}
