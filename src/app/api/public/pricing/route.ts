import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { buildPricingEngine, PricingContext } from "@so-cookies/pricing"
import { prisma } from "@/lib/prisma"
import { getCustomerSession } from "@/lib/customer-auth"
import { toNumber } from "@/lib/utils"

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

export async function POST(req: NextRequest) {
  try {
    const session = await getCustomerSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const parsed = pricingSchema.parse(body)

    type ProductBrief = { id: string; name: string; price: number }
    const productMap: Record<string, ProductBrief> = {}
    const products = await prisma.product.findMany({
      where: {
        id: { in: parsed.items.map((i) => i.productId) },
        active: true,
      },
      select: { id: true, name: true, price: true },
    })
    for (const p of products) productMap[p.id] = { id: p.id, name: p.name, price: toNumber(p.price) }

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

    const engine = buildPricingEngine(prisma)

    const result = await engine.calculatePrice(context)
    return NextResponse.json(result)
  } catch (err) {
    console.error("[pricing] error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to calculate price" },
      { status: 400 },
    )
  }
}
