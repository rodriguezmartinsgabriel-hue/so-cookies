import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { deliveryRouteSchema, getZodIssues } from "@/lib/validation"

function parseDate(v: string | null | undefined): Date | null {
  return v ? new Date(`${v}T00:00:00.000Z`) : null
}

export async function GET(request: Request) {
  const { error } = await requireAuth(request)
  if (error) return error
  try {
    const routes = await prisma.deliveryRoute.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
      include: { zone: { select: { id: true, name: true } } },
    })
    return NextResponse.json(routes)
  } catch {
    return NextResponse.json({ error: "Erro ao buscar rotas" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { error } = await requireAuth(request, "ADMIN")
  if (error) return error
  try {
    const json = await request.json()
    const parsed = deliveryRouteSchema.parse(json)
    const route = await prisma.deliveryRoute.create({
      data: {
        name: parsed.name,
        zoneId: parsed.zoneId,
        recurring: parsed.recurring,
        dayOfWeek: parsed.dayOfWeek ?? null,
        date: parseDate(parsed.date),
        startDate: parseDate(parsed.startDate),
        endDate: parseDate(parsed.endDate),
        cutoffTime: parsed.cutoffTime,
        cutoffOffsetDays: parsed.cutoffOffsetDays,
        windowStart: parsed.windowStart,
        windowEnd: parsed.windowEnd,
        capacityEnabled: parsed.capacityEnabled,
        maxOrders: parsed.maxOrders ?? null,
        maxItems: parsed.maxItems ?? null,
        active: parsed.active,
      },
      include: { zone: { select: { id: true, name: true } } },
    })
    return NextResponse.json(route, { status: 201 })
  } catch (e) {
    const issues = getZodIssues(e)
    if (issues) return NextResponse.json({ error: "Dados inválidos", details: issues }, { status: 400 })
    return NextResponse.json({ error: "Erro ao criar rota" }, { status: 500 })
  }
}
