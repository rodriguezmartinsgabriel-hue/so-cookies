import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { createCampaignSchema, getZodIssues } from "@/lib/validation"

export async function GET(request: Request) {
  const { error } = await requireAuth(request)
  if (error) return error
  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: [{ active: "desc" }, { startDate: "desc" }],
    })
    return NextResponse.json(campaigns)
  } catch {
    return NextResponse.json({ error: "Erro ao buscar campanhas" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { error } = await requireAuth(request, "ADMIN")
  if (error) return error
  try {
    const json = await request.json()
    const parsed = createCampaignSchema.parse(json)
    const campaign = await prisma.campaign.create({
      data: {
        name: parsed.name,
        description: parsed.description ?? null,
        type: parsed.type,
        priority: parsed.priority ?? 0,
        startDate: parsed.startDate ? new Date(parsed.startDate) : new Date(),
        endDate: parsed.endDate ? new Date(parsed.endDate) : null,
        active: parsed.active ?? true,
        applicableProducts: parsed.applicableProducts ?? [],
        conditions: parsed.conditions ?? {},
      },
    })
    return NextResponse.json(campaign, { status: 201 })
  } catch (e) {
    const issues = getZodIssues(e)
    if (issues) return NextResponse.json({ error: "Dados inválidos", details: issues }, { status: 400 })
    return NextResponse.json({ error: "Erro ao criar campanha" }, { status: 500 })
  }
}
