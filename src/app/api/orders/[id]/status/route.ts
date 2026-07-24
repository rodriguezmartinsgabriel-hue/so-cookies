import { NextResponse } from "next/server"
import { updateOrderStatus } from "@/lib/db"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { status } = await request.json()
  const order = await updateOrderStatus(id, status)
  return NextResponse.json(order)
}
