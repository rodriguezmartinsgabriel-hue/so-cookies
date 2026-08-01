import { prisma } from "@/lib/prisma"
import { MARKETPLACE_SLA_MINUTES, type NormalizedOrder, type Platform } from "./types"

function confirmDeadline(createdAt?: string): Date | null {
  return new Date(Date.now() + MARKETPLACE_SLA_MINUTES * 60_000)
}

export async function upsertOrder(input: {
  platform: Platform
  externalId: string
  externalStatus: string
  internalStatus: string
  order: NormalizedOrder
}) {
  const existing = await prisma.order.findUnique({
    where: { platform_externalId: { platform: input.platform, externalId: input.externalId } },
    select: { id: true, customer: true, notes: true, deliveryAddress: true, customerPhone: true, platformFee: true, confirmBy: true },
  })

  const isPending = input.internalStatus === "PENDENTE"

  if (existing) {
    return prisma.order.update({
      where: { id: existing.id },
      data: {
        status: input.internalStatus as any,
        externalStatus: input.externalStatus,
        customer: input.order.customer || existing.customer,
        customerPhone: input.order.customerPhone ?? existing.customerPhone,
        deliveryAddress: input.order.deliveryAddress ?? existing.deliveryAddress,
        platformFee: input.order.platformFee ?? existing.platformFee,
        notes: input.order.notes ?? existing.notes,
        confirmBy: isPending ? existing.confirmBy ?? confirmDeadline() : null,
        updatedAt: new Date(),
      },
    })
  }

  return prisma.order.create({
    data: {
      channel: input.order.channel,
      customer: input.order.customer || "Cliente",
      total: input.order.total,
      status: input.internalStatus as any,
      notes: input.order.notes,
      platform: input.platform,
      externalId: input.externalId,
      externalStatus: input.externalStatus,
      deliveryAddress: input.order.deliveryAddress,
      customerPhone: input.order.customerPhone,
      platformFee: input.order.platformFee,
      confirmBy: isPending ? confirmDeadline() : null,
      items: {
        create: input.order.items.map((it) => ({ name: it.name, qty: it.qty, price: it.price, notes: it.notes })),
      },
    },
  })
}
