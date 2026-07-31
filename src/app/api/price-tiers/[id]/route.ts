import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { isNotFoundError } from "@/lib/db";
import { updatePriceTierSchema } from "@/lib/validation";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth("OPERACIONAL")
  if (error) return error
  try {
    const { id } = await params
    const json = await request.json()
    const parsed = updatePriceTierSchema.parse(json)
    const tier = await prisma.priceTier.update({ where: { id }, data: parsed })
    return NextResponse.json(tier)
  } catch (e: any) {
    if (e?.issues) return NextResponse.json({ error: "Dados inválidos", details: e.issues }, { status: 400 })
    return NextResponse.json({ error: "Erro ao atualizar faixa de preço" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth("OPERACIONAL")
  if (error) return error
  try {
    const { id } = await params
    await prisma.priceTier.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (isNotFoundError(e)) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    return NextResponse.json({ error: "Erro ao deletar faixa de preço" }, { status: 500 })
  }
}
