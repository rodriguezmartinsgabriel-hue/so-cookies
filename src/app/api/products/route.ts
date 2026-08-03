import { NextResponse } from "next/server"
import { getProducts, createProduct } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"
import { createProductSchema, getZodIssues } from "@/lib/validation"

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const products = await getProducts()
    return NextResponse.json(products)
  } catch {
    return NextResponse.json({ error: "Erro ao listar produtos" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { error } = await requireAuth("OPERACIONAL")
  if (error) return error
  try {
    const json = await request.json()
    const parsed = createProductSchema.parse(json)
    const product = await createProduct(parsed)
    return NextResponse.json(product)
  } catch (e) {
    const issues = getZodIssues(e)
    if (issues) {
      return NextResponse.json({ error: "Dados inválidos", details: issues }, { status: 400 })
    }
    return NextResponse.json({ error: "Erro ao criar produto" }, { status: 500 })
  }
}
