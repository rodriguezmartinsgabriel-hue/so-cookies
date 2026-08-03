import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"

export async function GET() {
  const { error } = await requireAuth("ADMIN")
  if (error) return error

  try {
    const [
      users, products, ingredients, recipes, recipeItems, priceTiers,
      channels, sales, saleItems, orders, orderItems, cashFlow,
      productions, deliveryCosts, documents, contacts, contactInteractions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
      prisma.ingredient.count(),
      prisma.recipe.count(),
      prisma.recipeItem.count(),
      prisma.priceTier.count(),
      prisma.saleChannel.count(),
      prisma.sale.count(),
      prisma.saleItem.count(),
      prisma.order.count(),
      prisma.orderItem.count(),
      prisma.cashFlow.count(),
      prisma.production.count(),
      prisma.deliveryCost.count(),
      prisma.document.count(),
      prisma.contact.count(),
      prisma.contactInteraction.count(),
    ])

    const [syncApplyTotal, syncApply7d] = await Promise.all([
      prisma.syncApply.count(),
      prisma.syncApply.count({ where: { appliedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
    ])

    return NextResponse.json({
      tables: {
        users, products, ingredients, recipes, recipeItems, priceTiers,
        channels, sales, saleItems, orders, orderItems, cashFlow,
        productions, deliveryCosts, documents, contacts, contactInteractions,
      },
      syncApply: { total: syncApplyTotal, last7d: syncApply7d },
    })
  } catch {
    return NextResponse.json({ error: "Erro ao obter diagnósticos" }, { status: 500 })
  }
}
