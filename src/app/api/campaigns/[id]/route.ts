import { NextResponse } from "next/server"
import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { isNotFoundError } from "@/lib/db"
import { updateCampaignSchema, getZodIssues } from "@/lib/validation"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(request, "ADMIN")
  if (error) return error
  try {
    const { id } = await params
    const json = await request.json()
    const parsed = updateCampaignSchema.parse(json)
    const data: Prisma.CampaignUpdateInput = {
      ...(parsed.name !== undefined && { name: parsed.name }),
      ...(parsed.description !== undefined && { description: parsed.description }),
      ...(parsed.type !== undefined && { type: parsed.type }),
      ...(parsed.priority !== undefined && { priority: parsed.priority }),
      ...(parsed.startDate !== undefined && { startDate: parsed.startDate ? new Date(parsed.startDate) : new Date() }),
      ...(parsed.endDate !== undefined && { endDate: parsed.endDate ? new Date(parsed.endDate) : null }),
      ...(parsed.active !== undefined && { active: parsed.active }),
      ...(parsed.applicableProducts !== undefined && { applicableProducts: parsed.applicableProducts }),
      ...(parsed.conditions !== undefined && { conditions: parsed.conditions }),
    }
    const campaign = await prisma.campaign.update({ where: { id }, data })
    return NextResponse.json(campaign)
  } catch (e) {
    const issues = getZodIssues(e)
    if (issues) return NextResponse.json({ error: "Dados inválidos", details: issues }, { status: 400 })
    return NextResponse.json({ error: "Erro ao atualizar campanha" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(request, "ADMIN")
  if (error) return error
  try {
    const { id } = await params
    await prisma.campaign.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (isNotFoundError(e)) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    return NextResponse.json({ error: "Erro ao deletar campanha" }, { status: 500 })
  }
}
