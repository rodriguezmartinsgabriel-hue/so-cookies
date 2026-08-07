import { NextResponse } from "next/server"
import { requireCustomer } from "@/lib/customer-auth"
import { LoyaltyService } from "@/lib/loyalty/service"

export async function GET(request: Request) {
  const { error, customer } = await requireCustomer()
  if (error) return error
  try {
    const url = new URL(request.url)
    const limit = Number(url.searchParams.get("limit") ?? 20)
    const cursor = url.searchParams.get("cursor")
    const result = await LoyaltyService.getTransactions(customer.id, { limit, cursor })
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "Erro ao buscar histórico de pontos" }, { status: 500 })
  }
}
