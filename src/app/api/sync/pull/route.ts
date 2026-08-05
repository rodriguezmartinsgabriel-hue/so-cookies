import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"

export async function POST(request: Request) {
  const { error } = await requireAuth(request)
  if (error) return error
  try {
    let since: string | undefined
    try {
      const body = await request.json()
      since = body?.since
    } catch {
      since = undefined
    }
    const sinceDate = since ? new Date(since) : new Date(0)
    if (isNaN(sinceDate.getTime())) sinceDate.setTime(0)

    const serverTime = new Date().toISOString()

    const [orders, sales, cashFlow, productions, products, ingredients, recipes, documents, deliveryCosts, contacts, contactInteractions, priceTiers, deletions, channels] = await Promise.all([
      prisma.order.findMany({
        where: { updatedAt: { gt: sinceDate } },
        include: { items: { include: { product: { select: { id: true, name: true } } } } },
      }),
      prisma.sale.findMany({
        where: { updatedAt: { gt: sinceDate } },
        include: { channel: true, items: { include: { product: { select: { id: true, name: true } } } } },
      }),
      prisma.cashFlow.findMany({
        where: { updatedAt: { gt: sinceDate } },
      }),
      prisma.production.findMany({
        where: { updatedAt: { gt: sinceDate } },
      }),
      prisma.product.findMany({
        where: { deletedAt: null, updatedAt: { gt: sinceDate } },
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
        where: { updatedAt: { gt: sinceDate } },
      }),
      prisma.contact.findMany({
        where: { updatedAt: { gt: sinceDate } },
        include: { interactions: { orderBy: { createdAt: "desc" } } },
      }),
      prisma.contactInteraction.findMany({
        where: { createdAt: { gt: sinceDate } },
      }),
      prisma.priceTier.findMany({
        where: { updatedAt: { gt: sinceDate } },
      }),
      prisma.syncDelete.findMany({
        where: { createdAt: { gt: sinceDate } },
        select: { entity: true, recordId: true },
      }),
      prisma.saleChannel.findMany({}),
    ])

    const data = { orders, sales, cashFlow, productions, products, ingredients, recipes, documents, deliveryCosts, contacts, contactInteractions, priceTiers, deletions, channels, serverTime }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Erro no sync pull" }, { status: 500 })
  }
}