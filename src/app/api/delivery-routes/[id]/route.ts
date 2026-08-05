import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { deliveryRouteUpdateSchema, getZodIssues } from "@/lib/validation"

function parseDate(v: string | null | undefined): Date | null {
  return v ? new Date(`${v}T00:00:00.000Z`) : null
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth(request, "ADMIN")
  if (error) return error
  try {
    const { id } = await params
    const json = await request.json()
    const parsed = deliveryRouteUpdateSchema.parse(json)

    const data: Record<string, unknown> = {}
    if (parsed.name !== undefined) data.name = parsed.name
    if (parsed.zoneId !== undefined) data.zoneId = parsed.zoneId
    if (parsed.recurring !== undefined) data.recurring = parsed.recurring
    if (parsed.dayOfWeek !== undefined) data.dayOfWeek = parsed.dayOfWeek
    if (parsed.date !== undefined) data.date = parseDate(parsed.date)
    if (parsed.startDate !== undefined) data.startDate = parseDate(parsed.startDate)
    if (parsed.endDate !== undefined) data.endDate = parseDate(parsed.endDate)
    if (parsed.cutoffTime !== undefined) data.cutoffTime = parsed.cutoffTime
    if (parsed.cutoffOffsetDays !== undefined) data.cutoffOffsetDays = parsed.cutoffOffsetDays
    if (parsed.windowStart !== undefined) data.windowStart = parsed.windowStart
    if (parsed.windowEnd !== undefined) data.windowEnd = parsed.windowEnd
    if (parsed.capacityEnabled !== undefined) data.capacityEnabled = parsed.capacityEnabled
    if (parsed.maxOrders !== undefined) data.maxOrders = parsed.maxOrders
    if (parsed.maxItems !== undefined) data.maxItems = parsed.maxItems
    if (parsed.active !== undefined) data.active = parsed.active

    const route = await prisma.deliveryRoute.update({
      where: { id },
      data,
      include: { zone: { select: { id: true, name: true } } },
    })
    return NextResponse.json(route)
  } catch (e) {
    const issues = getZodIssues(e)
    if (issues) return NextResponse.json({ error: "Dados inválidos", details: issues }, { status: 400 })
    return NextResponse.json({ error: "Erro ao atualizar rota" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth(request, "ADMIN")
  if (error) return error
  try {
    const { id } = await params
    const orders = await prisma.order.count({ where: { deliveryRouteId: id } })
    if (orders > 0) {
      return NextResponse.json({ error: "Existem pedidos vinculados a esta rota" }, { status: 400 })
    }
    await prisma.deliveryRoute.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Erro ao excluir rota" }, { status: 500 })
  }
}
