import { NextResponse } from "next/server"
import { updateProduction, deleteProduction } from "@/lib/db"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const production = await updateProduction(id, body)
    return NextResponse.json(production)
  } catch (error) {
    return NextResponse.json({ error: "Failed to update production" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await deleteProduction(id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete production" }, { status: 500 })
  }
}
