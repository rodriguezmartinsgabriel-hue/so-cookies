import { NextResponse } from "next/server"
import { getCustomerCatalog } from "@/lib/customer-orders"
import { requireCustomer } from "@/lib/customer-auth"

export async function GET() {
  const { error } = await requireCustomer()
  if (error) return error
  try {
    const products = await getCustomerCatalog()
    return NextResponse.json(products)
  } catch {
    return NextResponse.json({ error: "Erro ao carregar cardápio" }, { status: 500 })
  }
}
