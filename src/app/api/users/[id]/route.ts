import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { requireAuth } from "@/lib/api-auth"
import { getUserById, updateUser, deleteUser, isNotFoundError, isConstraintError } from "@/lib/db"
import { updateUserSchema, getZodIssues } from "@/lib/validation"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth("ADMIN")
  if (error) return error
  try {
    const { id } = await params
    const json = await request.json()
    const parsed = updateUserSchema.parse(json)
    const data: Record<string, unknown> = {}
    if (parsed.name) data.name = parsed.name
    if (parsed.role) data.role = parsed.role
    if (parsed.password) data.password = await hash(parsed.password, 10)
    const user = await updateUser(id, data)
    return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role })
  } catch (e) {
    const issues = getZodIssues(e)
    if (issues) {
      return NextResponse.json({ error: "Dados inválidos", details: issues }, { status: 400 })
    }
    if (isNotFoundError(e)) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    return NextResponse.json({ error: "Erro ao atualizar usuário" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAuth("ADMIN")
  if (error) return error
  try {
    const { id } = await params
    if (session?.user?.id === id) {
      return NextResponse.json({ error: "Você não pode excluir o próprio usuário" }, { status: 400 })
    }
    const existing = await getUserById(id)
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    await deleteUser(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (isNotFoundError(e)) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    if (isConstraintError(e)) return NextResponse.json({ error: "Usuário possui registros associados (vendas, caixa ou documentos) e não pode ser excluído" }, { status: 409 })
    return NextResponse.json({ error: "Erro ao excluir usuário" }, { status: 500 })
  }
}
