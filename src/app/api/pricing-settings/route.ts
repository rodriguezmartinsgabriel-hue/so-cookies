import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { PricingRepository } from "@so-cookies/pricing"
import { pricingSettingsSchema, getZodIssues } from "@/lib/validation"

const DEFAULT_CHANNEL_CONFIG_JSON = {
  activatePriceTier: false,
  activateCoupon: false,
  activateCampaign: false,
  activateB2B: false,
  activateFreeShipping: false,
  b2bDiscountPercent: 0,
  activateLoyalty: true,
  pointsPerReal: 1,
  minOrderTotalForPoints: 0,
  roundingMode: "FLOOR",
}

export async function GET(request: Request) {
  const { error } = await requireAuth(request)
  if (error) return error
  try {
    const repo = new PricingRepository(prisma)
    const config = await repo.getChannelConfig("all")
    return NextResponse.json(config)
  } catch {
    return NextResponse.json({ error: "Erro ao buscar configurações de precificação" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const { error } = await requireAuth(request, "ADMIN")
  if (error) return error
  try {
    const json = await request.json()
    const parsed = pricingSettingsSchema.parse(json)

    const existing = await prisma.pricingSettings.findUnique({ where: { id: "default" } })
    const current =
      existing?.value && typeof existing.value === "object" && !Array.isArray(existing.value)
        ? (existing.value as Record<string, unknown>)
        : {}

    const value = { ...DEFAULT_CHANNEL_CONFIG_JSON, ...current, ...parsed }

    await prisma.pricingSettings.upsert({
      where: { id: "default" },
      update: { key: "default", value },
      create: {
        id: "default",
        key: "default",
        value,
        description: "Configuração de precificação (opt-in)",
      },
    })

    return NextResponse.json(value)
  } catch (e) {
    const issues = getZodIssues(e)
    if (issues) return NextResponse.json({ error: "Dados inválidos", details: issues }, { status: 400 })
    return NextResponse.json({ error: "Erro ao salvar configurações de precificação" }, { status: 500 })
  }
}
