import { NextResponse } from "next/server"
import { getSales, createSale } from "@/lib/db"

export async function GET() {
  const sales = await getSales()
  return NextResponse.json(sales)
}

export async function POST(request: Request) {
  const data = await request.json()
  const sale = await createSale(data)
  return NextResponse.json(sale)
}
