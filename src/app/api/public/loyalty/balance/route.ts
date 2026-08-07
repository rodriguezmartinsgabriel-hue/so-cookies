import { NextResponse } from "next/server"
import { requireCustomer } from "@/lib/customer-auth"
import { LoyaltyService } from "@/lib/loyalty/service"

export async function GET() {
  const { error, customer } = await requireCustomer()
  if (error) return error
  try {
    const balance = await LoyaltyService.getBalance(customer.id)
    const settings = await LoyaltyService.getSettings()
    return NextResponse.json({
      ...balance,
      active: settings.activateLoyalty,
      pointsPerReal: settings.pointsPerReal,
    })
  } catch {
    return NextResponse.json({ error: "Erro ao buscar saldo de pontos" }, { status: 500 })
  }
}
