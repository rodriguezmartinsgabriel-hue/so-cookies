import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { deliveryZoneSchema, getZodIssues } from "@/lib/validation"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(request, "ADMIN")
  if (error) return error
  try {
    const { id } = await params
    const json = await request.json()
    const parsed = deliveryZoneSchema.parse(json)
    const zone = await prisma.deliveryZone.update({ where: { id }, data: { name: parsed.name, active: parsed.active } })
    return NextResponse.json(zone)
  } catch (e) {
    const issues = getZodIssues(e)
    if (issues) return NextResponse.json({ error: "Dados inválidos", details: issues }, { status: 400 })
    return NextResponse.json({ error: "Erro ao atualizar zona" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(request, "ADMIN")
  if (error) return error
  try {
    const { id } = await params
    const routes = await prisma.deliveryRoute.count({ where: { zoneId: id } })
    if (routes > 0) {
      return NextResponse.json({ error: "Remova as rotas desta zona antes de excluí-la" }, { status: 400 })
    }
    await prisma.deliveryBlockedDate.deleteMany({ where: { zoneId: id } })
    await prisma.deliveryZone.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Erro ao excluir zona" }, { status: 500 })
  }
}
