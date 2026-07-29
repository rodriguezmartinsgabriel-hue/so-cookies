import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth("OPERACIONAL")
  if (error) return error
  try {
    const { id } = await params
    const json = await request.json()
    const data = await prisma.production.update({ where: { id }, data: json, include: { product: true } })
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: "Erro ao atualizar produção" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth("ADMIN")
  if (error) return error
  try {
    const { id } = await params
    await prisma.production.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: "Erro ao deletar produção" }, { status: 500 })
  }
}
