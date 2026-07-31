import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { isNotFoundError } from "@/lib/db"
import { updateRecipeSchema } from "@/lib/validation"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth()
  if (error) return error
  try {
    const { id } = await params
    const data = await prisma.recipe.findUnique({
      where: { id },
      include: { ingredients: { include: { ingredient: true } } },
    })
    if (!data) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: "Erro ao buscar receita" }, { status: 500 })
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
    const parsed = updateRecipeSchema.parse(json)
    const { ingredients, ...recipeData } = parsed
    const data = await prisma.recipe.update({ where: { id }, data: recipeData })
    if (ingredients && Array.isArray(ingredients)) {
      await prisma.recipeItem.deleteMany({ where: { recipeId: id } })
      await prisma.recipeItem.createMany({
        data: ingredients.map((i: { ingredientId: string; qty: number; unit: string }) => ({
          recipeId: id,
          ingredientId: i.ingredientId,
          qty: i.qty,
          unit: i.unit,
        })),
      })
    }
    const updated = await prisma.recipe.findUnique({
      where: { id },
      include: { ingredients: { include: { ingredient: true } } },
    })
    return NextResponse.json(updated)
  } catch (e: any) {
    if (e?.issues) return NextResponse.json({ error: "Dados inválidos", details: e.issues }, { status: 400 })
    return NextResponse.json({ error: "Erro ao atualizar receita" }, { status: 500 })
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
    await prisma.recipe.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (isNotFoundError(e)) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    return NextResponse.json({ error: "Erro ao deletar receita" }, { status: 500 })
  }
}
