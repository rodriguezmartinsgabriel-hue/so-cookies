import { NextResponse } from "next/server"
import { updateOrderStatus } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"
import { updateOrderStatusSchema } from "@/lib/validation"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth("OPERACIONAL")
  if (error) return error
  try {
    const { id } = await params
    const json = await request.json()
    const parsed = updateOrderStatusSchema.parse(json)
    const order = await updateOrderStatus(id, parsed.status)
    return NextResponse.json(order)
  } catch (e: any) {
    if (e?.issues) return NextResponse.json({ error: "Dados inválidos", details: e.issues }, { status: 400 })
    return NextResponse.json({ error: "Erro ao atualizar status" }, { status: 500 })
  }
}
