import { NextResponse } from "next/server"
import { updateDeliveryCost, deleteDeliveryCost } from "@/lib/db"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()
    const cost = await updateDeliveryCost(id, data)
    return NextResponse.json(cost)
  } catch (error) {
    return NextResponse.json({ error: "Failed to update delivery cost" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await deleteDeliveryCost(id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete delivery cost" }, { status: 500 })
  }
}
