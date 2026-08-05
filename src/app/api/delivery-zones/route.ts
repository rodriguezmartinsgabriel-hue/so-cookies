import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { deliveryZoneSchema, getZodIssues } from "@/lib/validation"

export async function GET(request: Request) {
  const { error } = await requireAuth(request)
  if (error) return error
  try {
    const zones = await prisma.deliveryZone.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { routes: true, orders: true } } },
    })
    return NextResponse.json(zones)
  } catch {
    return NextResponse.json({ error: "Erro ao buscar zonas" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { error } = await requireAuth(request, "ADMIN")
  if (error) return error
  try {
    const json = await request.json()
    const parsed = deliveryZoneSchema.parse(json)
    const zone = await prisma.deliveryZone.create({ data: { name: parsed.name, active: parsed.active } })
    return NextResponse.json(zone, { status: 201 })
  } catch (e) {
    const issues = getZodIssues(e)
    if (issues) return NextResponse.json({ error: "Dados inválidos", details: issues }, { status: 400 })
    return NextResponse.json({ error: "Erro ao criar zona" }, { status: 500 })
  }
}
