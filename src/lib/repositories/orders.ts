import type { PrismaClient, Order, Sale } from "@/generated/prisma/client"
import type { ListArgs, Paginated } from "../utils"

const orderInclude = {
  items: { include: { product: true } },
  customerRef: { select: { id: true, name: true, email: true, phone: true } },
} as const

export class OrderRepositoryPrisma {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Order | null> {
    return this.prisma.order.findUnique({ where: { id }, include: orderInclude })
  }

  async list(args: ListArgs = {}): Promise<Paginated<Order>> {
    const take = args.take ?? 50
    const rows = await this.prisma.order.findMany({
      take: take + 1,
      ...(args.cursor ? { cursor: { id: args.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
      include: orderInclude,
    })
    const hasMore = rows.length > take
    const data = hasMore ? rows.slice(0, take) : rows
    const nextCursor = hasMore ? (rows[take]?.id ?? null) : null
    return { data, nextCursor }
  }

  async listAll(): Promise<Order[]> {
    return this.prisma.order.findMany({ include: orderInclude, orderBy: { createdAt: "desc" } })
  }

  async create(data: {
    channel: string
    customer: string
    total: number
    notes?: string
    items: { productId: string; qty: number; price: number }[]
    deliveryDate?: string | null
    deliveryRouteId?: string | null
    deliveryCep?: string | null
    deliveryStreet?: string | null
    deliveryNumber?: string | null
    deliveryComplement?: string | null
    deliveryNeighborhood?: string | null
    deliveryCity?: string | null
    deliveryState?: string | null
  }): Promise<Order> {
    let deliveryZoneId: string | null = null
    if (data.deliveryRouteId) {
      const route = await this.prisma.deliveryRoute.findUnique({ where: { id: data.deliveryRouteId } })
      deliveryZoneId = route?.zoneId ?? null
    }
    return this.prisma.order.create({
      data: {
        channel: data.channel,
        customer: data.customer,
        total: data.total,
        notes: data.notes,
        status: "PENDENTE",
        deliveryDate: data.deliveryDate ? new Date(`${data.deliveryDate}T00:00:00.000Z`) : null,
        deliveryRouteId: data.deliveryRouteId ?? null,
        deliveryZoneId,
        deliveryCep: data.deliveryCep,
        deliveryStreet: data.deliveryStreet,
        deliveryNumber: data.deliveryNumber,
        deliveryComplement: data.deliveryComplement,
        deliveryNeighborhood: data.deliveryNeighborhood,
        deliveryCity: data.deliveryCity,
        deliveryState: data.deliveryState,
        items: { create: data.items },
      },
      include: { items: true },
    })
  }

  async update(
    id: string,
    data: { status?: Order["status"]; notes?: string; externalStatus?: string; confirmBy?: Date | null },
  ): Promise<Order> {
    return this.prisma.order.update({ where: { id }, data: data as Partial<Order>, include: orderInclude })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.order.delete({ where: { id } })
  }
}
