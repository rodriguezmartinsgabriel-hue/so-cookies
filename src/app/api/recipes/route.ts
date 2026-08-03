import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { createRecipeSchema, getZodIssues } from "@/lib/validation"

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error
  try {
    const data = await prisma.recipe.findMany({ include: { ingredients: { include: { ingredient: true } } } })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Erro ao buscar receitas" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { error } = await requireAuth("ADMIN")
  if (error) return error
  try {
    const json = await request.json()
    const parsed = createRecipeSchema.parse(json)
    const { ingredients, ...recipeData } = parsed
    const data = await prisma.recipe.create({
      data: {
        ...recipeData,
        ingredients: ingredients?.length
          ? { create: ingredients.map((i) => ({ ingredientId: i.ingredientId, qty: i.qty, unit: i.unit })) }
          : undefined,
      },
      include: { ingredients: { include: { ingredient: true } } },
    })
    return NextResponse.json(data)
  } catch (e) {
    const issues = getZodIssues(e)
    if (issues) {
      return NextResponse.json({ error: "Dados inválidos", details: issues }, { status: 400 })
    }
    return NextResponse.json({ error: "Erro ao criar receita" }, { status: 500 })
  }
}
