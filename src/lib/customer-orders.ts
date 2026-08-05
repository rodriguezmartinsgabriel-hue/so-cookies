import { prisma } from "./prisma"
import { toCatalogProduct, type CatalogProduct } from "./utils"
import { assertSlotAvailable, SlotError } from "./delivery-scheduling"
import { buildPricingEngine } from "@so-cookies/pricing"
import { PricingContext } from "@so-cookies/pricing"
import { createOrderPayment } from "./payments/service"
import { PaymentError } from "./payments/errors"

const PICKUP_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

export function generatePickupCode(): string {
  let code = ""
  for (let i = 0; i < 5; i++) {
    code += PICKUP_CHARS[Math.floor(Math.random() * PICKUP_CHARS.length)]
  }
  return code
}

export type { CatalogProduct }

export type DeliveryAddressInput = {
  deliveryCep?: string | null
  deliveryStreet?: string | null
  deliveryNumber?: string | null
  deliveryComplement?: string | null
  deliveryNeighborhood?: string | null
  deliveryCity?: string | null
  deliveryState?: string | null
}

export function formatDeliveryAddress(a: DeliveryAddressInput): string | null {
  if (!a.deliveryStreet && !a.deliveryCity) return null
  const street = [a.deliveryStreet, a.deliveryNumber].filter(Boolean).join(", ")
  const area = [a.deliveryNeighborhood, a.deliveryCity].filter(Boolean).join(" - ")
  const state = a.deliveryState ? ` - ${a.deliveryState}` : ""
  const lines = [street, `${area}${state}`].filter(Boolean).join(" · ")
  return [lines, a.deliveryComplement, a.deliveryCep ? `CEP ${a.deliveryCep}` : ""].filter(Boolean).join(" · ") || null
}

export async function getCustomerCatalog(): Promise<CatalogProduct[]> {
  const products = await prisma.product.findMany({
    where: { active: true, deletedAt: null },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: {
      recipes: {
        select: {
          image: true,
          yield: true,
          yieldUnit: true,
          ingredients: {
            select: {
              qty: true,
              unit: true,
              ingredient: {
                select: {
                  name: true,
                  brand: true,
                  caloriesPer100g: true,
                  proteinPer100g: true,
                  carbsPer100g: true,
                  fatPer100g: true,
                  allergens: true,
                  tags: true,
                },
              },
            },
          },
        },
      },
    },
  })
  return products.map(toCatalogProduct)
}

export async function createCustomerOrder(
  customerId: string,
  input: {
    items: { productId: string; qty: number }[]
    couponCode?: string | null
    paymentMethod?: "PIX" | null
    deliveryDate?: string | null
    deliveryRouteId?: string | null
    deliveryCep?: string | null
    deliveryStreet?: string | null
    deliveryNumber?: string | null
    deliveryComplement?: string | null
    deliveryNeighborhood?: string | null
    deliveryCity?: string | null
    deliveryState?: string | null
  },
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

  // Inicializar Pricing Engine v2
  const engine = buildPricingEngine(prisma)

  const totalItems = [...qtyByProduct.values()].reduce((sum, qty) => sum + qty, 0)
  const customer = await prisma.customer.findUnique({ where: { id: customerId } })
  if (!customer) throw new Error("Cliente não encontrado")

  const isDelivery = Boolean(input.deliveryDate && input.deliveryRouteId)

  let deliveryDate: Date | null = null
  let deliveryRouteId: string | null = null
  let deliveryZoneId: string | null = null
  let address: DeliveryAddressInput = {}
  let pickupCode: string | null = null

  if (isDelivery) {
    await assertSlotAvailable({
      routeId: input.deliveryRouteId!,
      date: input.deliveryDate!,
      newItems: totalItems,
    })
    const route = await prisma.deliveryRoute.findUnique({ where: { id: input.deliveryRouteId! } })
    if (!route) throw new SlotError("ROUTE_UNAVAILABLE", "Rota de entrega não encontrada")
    deliveryDate = new Date(`${input.deliveryDate}T00:00:00.000Z`)
    deliveryRouteId = route.id
    deliveryZoneId = route.zoneId
    address = {
      deliveryCep: input.deliveryCep ?? customer.addressCep,
      deliveryStreet: input.deliveryStreet ?? customer.addressStreet,
      deliveryNumber: input.deliveryNumber ?? customer.addressNumber,
      deliveryComplement: input.deliveryComplement ?? customer.addressComplement,
      deliveryNeighborhood: input.deliveryNeighborhood ?? customer.addressNeighborhood,
      deliveryCity: input.deliveryCity ?? customer.addressCity,
      deliveryState: input.deliveryState ?? customer.addressState,
    }
  } else {
    pickupCode = generatePickupCode()
  }

  // Preparar itens para o Pricing Engine
  const pricingItems = [...qtyByProduct.entries()].map(([productId, qty]) => {
    const product = productMap.get(productId)
    if (!product) {
      throw new Error("Produto indisponível")
    }
    return {
      productId: product.id,
      qty,
      basePrice: product.price,
      name: product.name
    }
  })

  // Calcular preço com Pricing Engine v2
  const pricingContext: PricingContext = {
    items: pricingItems,
    channel: isDelivery ? 'delivery' : 'pickup',
    customerType: 'CLIENTE',
    couponCode: input.couponCode ?? undefined
  }

  const pricingResult = await engine.calculatePrice(pricingContext)

  // Criar itens com preços calculados pelo Pricing Engine
  const items = pricingResult.state.items.map((pricingItem) => ({
    productId: pricingItem.productId,
    qty: pricingItem.qty,
    price: pricingItem.calculatedPrice
  }))

  const total = pricingResult.total

  const order = await prisma.order.create({
    data: {
      channel: "Só App",
      customer: customer.name,
      customerPhone: customer.phone,
      customerId,
      total,
      status: "PENDENTE",
      pickupCode,
      deliveryDate,
      deliveryRouteId,
      deliveryZoneId,
      deliveryAddress: formatDeliveryAddress(address),
      deliveryCep: address.deliveryCep,
      deliveryStreet: address.deliveryStreet,
      deliveryNumber: address.deliveryNumber,
      deliveryComplement: address.deliveryComplement,
      deliveryNeighborhood: address.deliveryNeighborhood,
      deliveryCity: address.deliveryCity,
      deliveryState: address.deliveryState,
      items: { create: items },
    },
    include: { items: { include: { product: true } }, deliveryRoute: true, deliveryZone: true },
  })

  if (input.paymentMethod === "PIX") {
    try {
      await createOrderPayment(order.id)
    } catch (e) {
      await prisma.order.delete({ where: { id: order.id } }).catch(() => {})
      throw e
    }
    const paid = await prisma.order.findUnique({
      where: { id: order.id },
      include: { items: { include: { product: true } }, deliveryRoute: true, deliveryZone: true },
    })
    if (paid) return paid
  }

  return order
}

export async function updateCustomerOrder(
  customerId: string,
  orderId: string,
  input: {
    deliveryDate?: string | null
    deliveryRouteId?: string | null
    deliveryCep?: string | null
    deliveryStreet?: string | null
    deliveryNumber?: string | null
    deliveryComplement?: string | null
    deliveryNeighborhood?: string | null
    deliveryCity?: string | null
    deliveryState?: string | null
  },
) {
  const existing = await prisma.order.findFirst({
    where: { id: orderId, customerId },
    include: { items: { select: { qty: true } } },
  })
  if (!existing) throw new SlotError("NOT_FOUND", "Pedido não encontrado")
  if (existing.status !== "PENDENTE") {
    throw new SlotError("ORDER_LOCKED", "Este pedido já foi confirmado e não pode mais ter a data alterada")
  }

  const totalItems = existing.items.reduce((s, i) => s + i.qty, 0)

  const switchToDelivery = input.deliveryDate && input.deliveryRouteId
  const switchToPickup = input.deliveryDate === null || input.deliveryRouteId === null

  let data: Record<string, unknown> = {}

  if (switchToDelivery) {
    await assertSlotAvailable({
      routeId: input.deliveryRouteId!,
      date: input.deliveryDate!,
      newItems: totalItems,
      excludeOrderId: orderId,
    })
    const route = await prisma.deliveryRoute.findUnique({ where: { id: input.deliveryRouteId! } })
    if (!route) throw new SlotError("ROUTE_UNAVAILABLE", "Rota de entrega não encontrada")
    const address: DeliveryAddressInput = {
      deliveryCep: input.deliveryCep ?? existing.deliveryCep,
      deliveryStreet: input.deliveryStreet ?? existing.deliveryStreet,
      deliveryNumber: input.deliveryNumber ?? existing.deliveryNumber,
      deliveryComplement: input.deliveryComplement ?? existing.deliveryComplement,
      deliveryNeighborhood: input.deliveryNeighborhood ?? existing.deliveryNeighborhood,
      deliveryCity: input.deliveryCity ?? existing.deliveryCity,
      deliveryState: input.deliveryState ?? existing.deliveryState,
    }
    data = {
      deliveryDate: new Date(`${input.deliveryDate}T00:00:00.000Z`),
      deliveryRouteId: route.id,
      deliveryZoneId: route.zoneId,
      pickupCode: null,
      deliveryAddress: formatDeliveryAddress(address),
      deliveryCep: address.deliveryCep,
      deliveryStreet: address.deliveryStreet,
      deliveryNumber: address.deliveryNumber,
      deliveryComplement: address.deliveryComplement,
      deliveryNeighborhood: address.deliveryNeighborhood,
      deliveryCity: address.deliveryCity,
      deliveryState: address.deliveryState,
    }
  } else if (switchToPickup) {
    data = {
      deliveryDate: null,
      deliveryRouteId: null,
      deliveryZoneId: null,
      deliveryAddress: null,
      deliveryCep: null,
      deliveryStreet: null,
      deliveryNumber: null,
      deliveryComplement: null,
      deliveryNeighborhood: null,
      deliveryCity: null,
      deliveryState: null,
      pickupCode: generatePickupCode(),
    }
  } else {
    const address: DeliveryAddressInput = {
      deliveryCep: input.deliveryCep ?? existing.deliveryCep,
      deliveryStreet: input.deliveryStreet ?? existing.deliveryStreet,
      deliveryNumber: input.deliveryNumber ?? existing.deliveryNumber,
      deliveryComplement: input.deliveryComplement ?? existing.deliveryComplement,
      deliveryNeighborhood: input.deliveryNeighborhood ?? existing.deliveryNeighborhood,
      deliveryCity: input.deliveryCity ?? existing.deliveryCity,
      deliveryState: input.deliveryState ?? existing.deliveryState,
    }
    data = {
      deliveryCep: address.deliveryCep,
      deliveryStreet: address.deliveryStreet,
      deliveryNumber: address.deliveryNumber,
      deliveryComplement: address.deliveryComplement,
      deliveryNeighborhood: address.deliveryNeighborhood,
      deliveryCity: address.deliveryCity,
      deliveryState: address.deliveryState,
      deliveryAddress: formatDeliveryAddress(address),
    }
  }

  return prisma.order.update({
    where: { id: orderId },
    data,
    include: { items: { include: { product: true } }, deliveryRoute: true, deliveryZone: true },
  })
}

export async function retryCustomerOrderPayment(customerId: string, orderId: string) {
  const existing = await prisma.order.findFirst({
    where: { id: orderId, customerId },
    include: { items: { select: { qty: true } } },
  })
  if (!existing) throw new SlotError("NOT_FOUND", "Pedido não encontrado")
  if (existing.paymentStatus === "PAGO") {
    throw new PaymentError("ALREADY_PAID", "Este pedido já foi pago")
  }

  const expired =
    existing.paymentStatus === "EXPIRADO" ||
    (existing.paymentStatus === "AGUARDANDO_PAGAMENTO" &&
      existing.paymentExpiresAt != null &&
      existing.paymentExpiresAt.getTime() < Date.now())
  if (!expired) {
    throw new PaymentError("PAYMENT_PENDING", "O pagamento atual ainda está válido")
  }

  const totalItems = existing.items.reduce((s, i) => s + i.qty, 0)
  if (existing.deliveryRouteId && existing.deliveryDate) {
    await assertSlotAvailable({
      routeId: existing.deliveryRouteId,
      date: existing.deliveryDate.toISOString().slice(0, 10),
      newItems: totalItems,
      excludeOrderId: orderId,
    })
  }

  await createOrderPayment(orderId)
  await prisma.order.update({
    where: { id: orderId },
    data: { status: "PENDENTE", paidAt: null, updatedAt: new Date() },
  })

  return prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } }, deliveryRoute: true, deliveryZone: true },
  })
}

export async function getCustomerOrder(customerId: string, orderId: string) {
  return prisma.order.findFirst({
    where: { id: orderId, customerId },
    include: {
      items: { include: { product: true } },
      deliveryRoute: { select: { id: true, name: true, windowStart: true, windowEnd: true } },
      deliveryZone: { select: { id: true, name: true } },
    },
  })
}

export async function getCustomerOrders(customerId: string) {
  return prisma.order.findMany({
    where: { customerId },
    include: {
      items: { include: { product: true } },
      deliveryRoute: { select: { id: true, name: true, windowStart: true, windowEnd: true } },
      deliveryZone: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}
