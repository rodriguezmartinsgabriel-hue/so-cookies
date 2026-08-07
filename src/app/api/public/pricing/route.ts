import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getPricingEngine, PricingContext } from "@so-cookies/pricing"
import { prisma } from "@/lib/prisma"
import { getCustomerSession } from "@/lib/customer-auth"
import { toNumber } from "@/lib/utils"
import { logger } from "@/lib/logger"

const pricingSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string(),
        qty: z.number().int().positive(),
        basePrice: z.number().optional(),
        name: z.string().optional(),
      }),
    )
    .min(1),
  channel: z.enum(["delivery", "pickup", "digital"]).default("pickup"),
  couponCode: z.string().trim().optional(),
  customerType: z.enum(["CLIENTE", "B2B", "EMPRESA", "SUBSCRIBER"]).default("CLIENTE"),
})

type ProductBrief = { id: string; name: string; price: number }
// Cache em memória com TTL para o lookup base de produtos (id/name/price são
// praticamente estáticos entre requests).
const productCache = new Map<string, { value: ProductBrief; expiresAt: number }>()
const PRODUCT_CACHE_TTL_MS = 60_000
// Dedup de queries concorrentes: requests que faltam os mesmos ids compartilham a query.
const inFlightProducts = new Map<string, Promise<void>>()

async function getCachedProductsByIds(ids: string[]): Promise<Record<string, ProductBrief>> {
  const now = Date.now()
  const map: Record<string, ProductBrief> = {}
  const missing: string[] = []

  for (const id of ids) {
    const entry = productCache.get(id)
    if (entry && entry.expiresAt > now) {
      map[id] = entry.value
    } else {
      missing.push(id)
    }
  }

  if (missing.length > 0) {
    const cacheKey = [...missing].sort().join(",")
    let pending = inFlightProducts.get(cacheKey)
    if (!pending) {
      pending = prisma.product
        .findMany({
          where: { id: { in: missing }, active: true },
          select: { id: true, name: true, price: true },
        })
        .then((rows) => {
          for (const row of rows) {
            const brief = { id: row.id, name: row.name, price: toNumber(row.price) }
            productCache.set(row.id, { value: brief, expiresAt: now + PRODUCT_CACHE_TTL_MS })
          }
        })
        .catch((err) => {
          logger.warn(
            "[pricing] falha ao popular cache de produtos",
            { ids: missing },
            err instanceof Error ? err : new Error(String(err)),
          )
        })
        .finally(() => {
          inFlightProducts.delete(cacheKey)
        })
      inFlightProducts.set(cacheKey, pending)
    }
    await pending

    for (const id of missing) {
      const entry = productCache.get(id)
      if (entry && entry.expiresAt > now) {
        map[id] = entry.value
      }
    }
  }

  return map
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCustomerSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    const body = await req.json()
    const parsed = pricingSchema.parse(body)

    const productMap = await getCachedProductsByIds(parsed.items.map((i) => i.productId))

    const context: PricingContext = {
      customerId: session.id,
      customerType: parsed.customerType,
      channel: parsed.channel,
      couponCode: parsed.couponCode,
      items: parsed.items.map((item) => ({
        productId: item.productId,
        qty: item.qty,
        basePrice: item.basePrice ?? productMap[item.productId]?.price ?? 0,
        name: item.name || productMap[item.productId]?.name || "",
      })),
    }

    const engine = getPricingEngine(prisma)

    const result = await engine.calculatePrice(context)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: err.issues }, { status: 400 })
    }
    logger.error("[pricing] erro ao calcular preço", undefined, err)
    return NextResponse.json(
      { error: "Não foi possível calcular o preço. Tente novamente em instantes." },
      { status: 500 },
    )
  }
}
