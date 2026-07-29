import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth("OPERACIONAL")
  if (error) return error
  try {
    const { id } = await params
    const json = await request.json()
    const cost = await prisma.deliveryCost.update({ where: { id }, data: json })
    return NextResponse.json(cost)
  } catch (e) {
    return NextResponse.json({ error: "Erro ao atualizar custo de entrega" }, { status: 500 })
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
    await prisma.deliveryCost.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: "Erro ao deletar custo de entrega" }, { status: 500 })
  }
}
