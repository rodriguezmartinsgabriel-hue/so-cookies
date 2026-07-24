import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const { changes } = await request.json()
  const mappings: Record<string, string> = {}

  for (const change of changes) {
    try {
      switch (`${change.entity}:${change.action}`) {
        case "order:create": {
          const { items, tempId, ...orderData } = change.data
          const created = await prisma.order.create({
            data: {
              channel: orderData.channel,
              customer: orderData.customer,
              total: orderData.total,
              status: orderData.status || "PENDENTE",
              notes: orderData.notes,
              items: items ? { create: items.map((i: { productId: string; qty: number; price: number }) => ({ productId: i.productId, qty: i.qty, price: i.price })) } : undefined,
            },
          })
          if (tempId) mappings[tempId] = created.id
          break
        }
        case "order:update": {
          await prisma.order.update({
            where: { id: change.data.id },
            data: { status: change.data.status, updatedAt: new Date() },
          })
          break
        }
        case "sale:create": {
          const { items, tempId, ...saleData } = change.data
          const created = await prisma.sale.create({
            data: {
              channelId: saleData.channelId,
              total: saleData.total,
              userId: saleData.userId,
              items: items ? { create: items.map((i: { productId: string; qty: number; price: number }) => ({ productId: i.productId, qty: i.qty, price: i.price })) } : undefined,
            },
          })
          if (tempId) mappings[tempId] = created.id
          break
        }
        case "cashFlow:create": {
          const { tempId, ...cashData } = change.data
          const created = await prisma.cashFlow.create({
            data: {
              type: cashData.type,
              category: cashData.category,
              description: cashData.description,
              amount: cashData.amount,
              userId: cashData.userId,
              date: new Date(cashData.date),
            },
          })
          if (tempId) mappings[tempId] = created.id
          break
        }
        case "production:create": {
          const { tempId, ...prodData } = change.data
          const created = await prisma.production.create({
            data: {
              batchCode: prodData.batchCode,
              productId: prodData.productId,
              qty: prodData.qty,
              status: prodData.status || "pendente",
              notes: prodData.notes,
            },
          })
          if (tempId) mappings[tempId] = created.id
          break
        }
        case "production:update": {
          await prisma.production.update({
            where: { id: change.data.id },
            data: {
              status: change.data.status,
              ...(change.data.endTime ? { endTime: new Date(change.data.endTime) } : {}),
            },
          })
          break
        }
      }
    } catch (e) {
      console.error(`Sync error for ${change.entity}:${change.action}`, e)
    }
  }

  return NextResponse.json({ ok: true, mappings })
}