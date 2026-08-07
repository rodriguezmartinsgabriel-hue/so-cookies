import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { createCouponSchema, getZodIssues } from "@/lib/validation"

export async function GET(request: Request) {
  const { error } = await requireAuth(request)
  if (error) return error
  try {
    const coupons = await prisma.coupon.findMany({ orderBy: [{ active: "desc" }, { code: "asc" }] })
    return NextResponse.json(coupons)
  } catch {
    return NextResponse.json({ error: "Erro ao buscar cupons" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { error } = await requireAuth(request, "ADMIN")
  if (error) return error
  try {
    const json = await request.json()
    const parsed = createCouponSchema.parse(json)
    const coupon = await prisma.coupon.create({
      data: {
        code: parsed.code,
        name: parsed.name,
        description: parsed.description ?? null,
        type: parsed.type,
        value: parsed.value,
        minOrderValue: parsed.minOrderValue ?? 0,
        maxDiscount: parsed.maxDiscount ?? null,
        usageLimit: parsed.usageLimit ?? 1,
        validFrom: parsed.validFrom ? new Date(parsed.validFrom) : new Date(),
        validUntil: parsed.validUntil ? new Date(parsed.validUntil) : null,
        active: parsed.active ?? true,
        applicableProducts: parsed.applicableProducts ?? [],
        applicableTypes: parsed.applicableTypes ?? ["all"],
      },
    })
    return NextResponse.json(coupon, { status: 201 })
  } catch (e) {
    const issues = getZodIssues(e)
    if (issues) return NextResponse.json({ error: "Dados inválidos", details: issues }, { status: 400 })
    if ((e as { code?: string }).code === "P2002")
      return NextResponse.json({ error: "Já existe um cupom com esse código" }, { status: 409 })
    return NextResponse.json({ error: "Erro ao criar cupom" }, { status: 500 })
  }
}
