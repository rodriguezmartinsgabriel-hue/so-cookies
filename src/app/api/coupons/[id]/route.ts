import { NextResponse } from "next/server"
import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { isNotFoundError } from "@/lib/db"
import { updateCouponSchema, getZodIssues } from "@/lib/validation"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(request, "ADMIN")
  if (error) return error
  try {
    const { id } = await params
    const json = await request.json()
    const parsed = updateCouponSchema.parse(json)
    const data: Prisma.CouponUpdateInput = {
      ...(parsed.code !== undefined && { code: parsed.code }),
      ...(parsed.name !== undefined && { name: parsed.name }),
      ...(parsed.description !== undefined && { description: parsed.description }),
      ...(parsed.type !== undefined && { type: parsed.type }),
      ...(parsed.value !== undefined && { value: parsed.value }),
      ...(parsed.minOrderValue !== undefined && { minOrderValue: parsed.minOrderValue }),
      ...(parsed.maxDiscount !== undefined && { maxDiscount: parsed.maxDiscount }),
      ...(parsed.usageLimit !== undefined && { usageLimit: parsed.usageLimit }),
      ...(parsed.validFrom !== undefined && { validFrom: parsed.validFrom ? new Date(parsed.validFrom) : new Date() }),
      ...(parsed.validUntil !== undefined && {
        validUntil: parsed.validUntil ? new Date(parsed.validUntil) : null,
      }),
      ...(parsed.active !== undefined && { active: parsed.active }),
      ...(parsed.applicableProducts !== undefined && { applicableProducts: parsed.applicableProducts }),
      ...(parsed.applicableTypes !== undefined && { applicableTypes: parsed.applicableTypes }),
    }
    const coupon = await prisma.coupon.update({ where: { id }, data })
    return NextResponse.json(coupon)
  } catch (e) {
    const issues = getZodIssues(e)
    if (issues) return NextResponse.json({ error: "Dados inválidos", details: issues }, { status: 400 })
    if ((e as { code?: string }).code === "P2002")
      return NextResponse.json({ error: "Já existe um cupom com esse código" }, { status: 409 })
    return NextResponse.json({ error: "Erro ao atualizar cupom" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(request, "ADMIN")
  if (error) return error
  try {
    const { id } = await params
    await prisma.coupon.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (isNotFoundError(e)) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    return NextResponse.json({ error: "Erro ao deletar cupom" }, { status: 500 })
  }
}
