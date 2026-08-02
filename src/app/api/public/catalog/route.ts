import { NextResponse } from "next/server"
import { getCustomerCatalog } from "@/lib/customer-orders"

export async function GET() {
  try {
    const products = await getCustomerCatalog()
    return NextResponse.json(products)
  } catch {
    return NextResponse.json({ error: "Erro ao carregar cardápio" }, { status: 500 })
  }
}
