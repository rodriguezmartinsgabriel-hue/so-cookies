import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { isNotFoundError } from "@/lib/db"
import { updateIngredientSchema } from "@/lib/validation"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth()
  if (error) return error
  try {
    const { id } = await params
    const data = await prisma.ingredient.findUnique({ where: { id } })
    if (!data) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: "Erro ao buscar ingrediente" }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth("ADMIN")
  if (error) return error
  try {
    const { id } = await params
    const json = await request.json()
    const parsed = updateIngredientSchema.parse(json)
    const data = await prisma.ingredient.update({ where: { id }, data: parsed })
    return NextResponse.json(data)
  } catch (e: any) {
    if (e?.issues) return NextResponse.json({ error: "Dados inválidos", details: e.issues }, { status: 400 })
    return NextResponse.json({ error: "Erro ao atualizar ingrediente" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth("ADMIN")
  if (error) return error
  try {
    const { id } = await params
    await prisma.ingredient.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (isNotFoundError(e)) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    return NextResponse.json({ error: "Erro ao deletar ingrediente" }, { status: 500 })
  }
}
