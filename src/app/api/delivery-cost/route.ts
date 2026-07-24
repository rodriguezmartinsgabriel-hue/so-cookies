import { NextResponse } from "next/server"
import { getDeliveryCosts, createDeliveryCost } from "@/lib/db"

export async function GET() {
  try {
    const costs = await getDeliveryCosts()
    return NextResponse.json(costs)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch delivery costs" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const cost = await createDeliveryCost(data)
    return NextResponse.json(cost)
  } catch (error) {
    return NextResponse.json({ error: "Failed to create delivery cost" }, { status: 500 })
  }
}
