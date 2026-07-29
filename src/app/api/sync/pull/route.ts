import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"

export async function POST(request: Request) {
  const { error } = await requireAuth()
  if (error) return error
  try {
    const { since } = await request.json()
    const sinceDate = new Date(since)

    const [orders, sales, cashFlow, productions, ingredients, recipes, documents, deliveryCosts] = await Promise.all([
      prisma.order.findMany({
        where: { updatedAt: { gt: sinceDate } },
        include: { items: true },
      }),
      prisma.sale.findMany({
        where: { createdAt: { gt: sinceDate } },
        include: { items: true },
      }),
      prisma.cashFlow.findMany({
        where: { date: { gt: sinceDate } },
      }),
      prisma.production.findMany({
        where: { updatedAt: { gt: sinceDate } },
      }),
      prisma.ingredient.findMany({
        where: { updatedAt: { gt: sinceDate } },
      }),
      prisma.recipe.findMany({
        where: { updatedAt: { gt: sinceDate } },
        include: { ingredients: { include: { ingredient: true } } },
      }),
      prisma.document.findMany({
        where: { updatedAt: { gt: sinceDate } },
      }),
      prisma.deliveryCost.findMany({
        where: { createdAt: { gt: sinceDate } },
      }),
    ])

    return NextResponse.json({ orders, sales, cashFlow, productions, ingredients, recipes, documents, deliveryCosts })
  } catch (e) {
    return NextResponse.json({ error: "Erro no sync pull" }, { status: 500 })
  }
}