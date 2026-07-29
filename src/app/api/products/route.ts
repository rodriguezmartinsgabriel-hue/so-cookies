import { NextResponse } from "next/server"
import { getProducts, createProduct } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"
import { createProductSchema } from "@/lib/validation"

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error
  const products = await getProducts()
  return NextResponse.json(products)
}

export async function POST(request: Request) {
  const { error } = await requireAuth()
  if (error) return error
  try {
    const json = await request.json()
    const parsed = createProductSchema.parse(json)
    const product = await createProduct(parsed)
    return NextResponse.json(product)
  } catch (e: any) {
    if (e?.issues) {
      return NextResponse.json({ error: "Dados inválidos", details: e.issues }, { status: 400 })
    }
    return NextResponse.json({ error: "Erro ao criar produto" }, { status: 500 })
  }
}
