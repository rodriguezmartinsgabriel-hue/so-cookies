import type { PrismaClient, Sale } from "@/generated/prisma/client"
import type { ListArgs, Paginated } from "../utils"

const userSafeSelect = { id: true, name: true, email: true, role: true }
const saleInclude = {
  channel: true,
  items: { include: { product: true } },
  user: { select: userSafeSelect },
} as const

export class SaleRepositoryPrisma {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Sale | null> {
    return this.prisma.sale.findUnique({ where: { id }, include: saleInclude })
  }

  async list(args: ListArgs = {}): Promise<Paginated<Sale>> {
    const take = args.take ?? 50
    const rows = await this.prisma.sale.findMany({
      take: take + 1,
      ...(args.cursor ? { cursor: { id: args.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
      include: saleInclude,
    })
    const hasMore = rows.length > take
    const data = hasMore ? rows.slice(0, take) : rows
    const nextCursor = hasMore ? (rows[take]?.id ?? null) : null
    return { data, nextCursor }
  }

  async listAll(): Promise<Sale[]> {
    return this.prisma.sale.findMany({ include: saleInclude, orderBy: { createdAt: "desc" } })
  }

  async create(data: {
    channelId: string
    total: number
    userId?: string
    items: { productId: string; qty: number; price: number }[]
  }): Promise<Sale> {
    return this.prisma.sale.create({
      data: { channelId: data.channelId, total: data.total, userId: data.userId, items: { create: data.items } },
      include: { items: true },
    })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.sale.delete({ where: { id } })
  }
}
