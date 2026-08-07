import { NextResponse } from "next/server"
import { requireCustomer } from "@/lib/customer-auth"
import { LoyaltyService } from "@/lib/loyalty/service"

export async function GET() {
  const { error } = await requireCustomer()
  if (error) return error
  try {
    const rewards = await LoyaltyService.listRewards()
    return NextResponse.json({ items: rewards })
  } catch {
    return NextResponse.json({ error: "Erro ao buscar catálogo de prêmios" }, { status: 500 })
  }
}
