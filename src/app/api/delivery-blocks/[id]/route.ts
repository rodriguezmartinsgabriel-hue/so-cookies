import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth(request, "ADMIN")
  if (error) return error
  try {
    const { id } = await params
    await prisma.deliveryBlockedDate.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Erro ao excluir bloqueio" }, { status: 500 })
  }
}
