import { NextResponse } from "next/server"
import { getCashEntry, updateCashEntry, deleteCashEntry } from "@/lib/db"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const entry = await getCashEntry(id)
    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(entry)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch cash entry" }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()
    const entry = await updateCashEntry(id, data)
    return NextResponse.json(entry)
  } catch (error) {
    return NextResponse.json({ error: "Failed to update cash entry" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await deleteCashEntry(id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete cash entry" }, { status: 500 })
  }
}
