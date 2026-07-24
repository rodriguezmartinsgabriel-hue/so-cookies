import { NextResponse } from "next/server"
import { getOrders, createOrder } from "@/lib/db"

export async function GET() {
  const orders = await getOrders()
  return NextResponse.json(orders)
}

export async function POST(request: Request) {
  const data = await request.json()
  const order = await createOrder(data)
  return NextResponse.json(order)
}
