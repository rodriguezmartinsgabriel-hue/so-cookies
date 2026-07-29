import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth("ADMIN")
  if (error) return error
  try {
    const { id } = await params
    const json = await request.json()
    const data = await prisma.saleChannel.update({ where: { id }, data: json })
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: "Erro ao atualizar canal" }, { status: 500 })
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
    await prisma.saleChannel.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: "Erro ao deletar canal" }, { status: 500 })
  }
}
