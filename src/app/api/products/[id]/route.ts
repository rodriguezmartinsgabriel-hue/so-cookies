import { NextResponse } from "next/server"
import { getProduct, updateProduct, deleteProduct, isNotFoundError } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"
import { updateProductSchema } from "@/lib/validation"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth()
  if (error) return error
  try {
    const { id } = await params
    const product = await getProduct(id)
    if (!product) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    return NextResponse.json(product)
  } catch (e) {
    return NextResponse.json({ error: "Erro ao buscar produto" }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth("OPERACIONAL")
  if (error) return error
  try {
    const { id } = await params
    const json = await request.json()
    const parsed = updateProductSchema.parse(json)
    const product = await updateProduct(id, parsed)
    return NextResponse.json(product)
  } catch (e: any) {
    if (e?.issues) return NextResponse.json({ error: "Dados inválidos", details: e.issues }, { status: 400 })
    return NextResponse.json({ error: "Erro ao atualizar produto" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth("OPERACIONAL")
  if (error) return error
  try {
    const { id } = await params
    await deleteProduct(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (isNotFoundError(e)) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    return NextResponse.json({ error: "Erro ao deletar produto" }, { status: 500 })
  }
}
