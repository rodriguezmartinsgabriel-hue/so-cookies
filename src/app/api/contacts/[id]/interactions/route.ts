import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"
import { getContactInteractions, createContactInteraction } from "@/lib/db"
import { createInteractionSchema } from "@/lib/validation"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth()
  if (error) return error
  try {
    const { id } = await params
    const data = await getContactInteractions(id)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Erro ao buscar interações" }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth("OPERACIONAL")
  if (error) return error
  try {
    const { id } = await params
    const json = await request.json()
    const parsed = createInteractionSchema.parse(json)
    const data = await createContactInteraction(id, parsed)
    return NextResponse.json(data)
  } catch (e: any) {
    if (e?.issues) {
      return NextResponse.json({ error: "Dados inválidos", details: e.issues }, { status: 400 })
    }
    return NextResponse.json({ error: "Erro ao criar interação" }, { status: 500 })
  }
}
