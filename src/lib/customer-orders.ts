import { prisma } from "./prisma"
import { toCatalogProduct, type CatalogProduct } from "./utils"

const PICKUP_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

export function generatePickupCode(): string {
  let code = ""
  for (let i = 0; i < 5; i++) {
    code += PICKUP_CHARS[Math.floor(Math.random() * PICKUP_CHARS.length)]
  }
  return code
}

export type { CatalogProduct }

export async function getCustomerCatalog(): Promise<CatalogProduct[]> {
  const products = await prisma.product.findMany({
    where: { active: true, deletedAt: null },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: { recipes: { select: { image: true } } },
  })
  return products.map(toCatalogProduct)
}

export async function createCustomerOrder(
  customerId: string,
  input: { items: { productId: string; qty: number }[] },
) {
  const productIds = [...new Set(input.items.map((i) => i.productId))]
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, active: true, deletedAt: null },
  })
  const productMap = new Map(products.map((p) => [p.id, p]))

  const qtyByProduct = new Map<string, number>()
  for (const i of input.items) {
    qtyByProduct.set(i.productId, (qtyByProduct.get(i.productId) || 0) + i.qty)
  }

  const items = [...qtyByProduct.entries()].map(([productId, qty]) => {
    const product = productMap.get(productId)
    if (!product) {
      throw new Error("Produto indisponível")
    }
    return { productId: product.id, qty, price: product.price }
  })

  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0)
  const customer = await prisma.customer.findUnique({ where: { id: customerId } })
  if (!customer) throw new Error("Cliente não encontrado")

  return prisma.order.create({
    data: {
      channel: "Só App",
      customer: customer.name,
      customerPhone: customer.phone,
      customerId,
      total,
      status: "PENDENTE",
      pickupCode: generatePickupCode(),
      items: { create: items },
    },
    include: { items: { include: { product: true } } },
  })
}

export async function getCustomerOrder(customerId: string, orderId: string) {
  return prisma.order.findFirst({
    where: { id: orderId, customerId },
    include: { items: { include: { product: true } } },
  })
}

export async function getCustomerOrders(customerId: string) {
  return prisma.order.findMany({
    where: { customerId },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  })
}
