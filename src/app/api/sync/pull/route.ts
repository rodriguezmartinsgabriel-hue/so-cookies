import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const { since } = await request.json()
  const sinceDate = new Date(since)

  const [orders, sales, cashFlow, productions, ingredients] = await Promise.all([
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
  ])

  return NextResponse.json({ orders, sales, cashFlow, productions, ingredients })
}