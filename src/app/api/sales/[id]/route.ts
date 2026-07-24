import { NextResponse } from "next/server"
import { getSale, deleteSale } from "@/lib/db"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sale = await getSale(id)
    if (!sale) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(sale)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch sale" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await deleteSale(id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete sale" }, { status: 500 })
  }
}
