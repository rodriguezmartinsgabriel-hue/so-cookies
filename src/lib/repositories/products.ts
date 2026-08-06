import type { PrismaClient, Product } from "@/generated/prisma/client"
import type { ListArgs, Paginated } from "../utils"

export class ProductRepositoryPrisma {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Product | null> {
    return this.prisma.product.findUnique({ where: { id } })
  }

  async list(args: ListArgs = {}): Promise<Paginated<Product>> {
    const take = args.take ?? 50
    const rows = await this.prisma.product.findMany({
      take: take + 1,
      where: { deletedAt: null },
      ...(args.cursor ? { cursor: { id: args.cursor }, skip: 1 } : {}),
      orderBy: { name: "asc" },
    })
    const hasMore = rows.length > take
    const data = hasMore ? rows.slice(0, take) : rows
    const nextCursor = hasMore ? (rows[take]?.id ?? null) : null
    return { data, nextCursor }
  }

  async listAll(): Promise<Product[]> {
    return this.prisma.product.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } })
  }

  async listIncludingDeleted(): Promise<Product[]> {
    return this.prisma.product.findMany({ orderBy: { name: "asc" } })
  }

  async create(data: {
    name: string
    sku: string
    category: string
    price: number
    cost: number
    unit?: string
    image?: string | null
    active?: boolean
  }): Promise<Product> {
    return this.prisma.product.create({ data: { margin: 0, ...data } })
  }

  async update(
    id: string,
    data: {
      name?: string
      sku?: string
      category?: string
      price?: number
      cost?: number
      unit?: string
      image?: string | null
      active?: boolean
      description?: string | null
      margin?: number
      deletedAt?: Date | null
    },
  ): Promise<Product> {
    return this.prisma.product.update({ where: { id }, data })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.product.update({ where: { id }, data: { active: false, deletedAt: new Date() } })
  }

  async hardDelete(id: string): Promise<void> {
    await this.prisma.product.delete({ where: { id } })
  }
}
