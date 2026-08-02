import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { runLazyReconcile } from "@/lib/integrations/reconcile"

export async function POST(request: Request) {
  const { error } = await requireAuth()
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

    const [orders, sales, cashFlow, productions, ingredients, recipes, documents, deliveryCosts, contacts, contactInteractions, deletions] = await Promise.all([
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
      prisma.syncDelete.findMany({
        where: { createdAt: { gt: sinceDate } },
        select: { entity: true, recordId: true },
      }),
    ])

    const data = { orders, sales, cashFlow, productions, ingredients, recipes, documents, deliveryCosts, contacts, contactInteractions, deletions, serverTime: new Date().toISOString() }

    await runLazyReconcile().catch(() => {})

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Erro no sync pull" }, { status: 500 })
  }
}