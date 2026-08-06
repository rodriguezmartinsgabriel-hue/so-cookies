import { prisma } from "../prisma"
import { ProductRepositoryPrisma } from "./products"
import { OrderRepositoryPrisma } from "./orders"
import { SaleRepositoryPrisma } from "./sales"

export const productRepository = new ProductRepositoryPrisma(prisma)
export const orderRepository = new OrderRepositoryPrisma(prisma)
export const saleRepository = new SaleRepositoryPrisma(prisma)

export type { Repository } from "./types"
