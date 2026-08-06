import { NextResponse } from "next/server"
import { getProductsPaginated, createProduct } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"
import { createProductSchema, getZodIssues } from "@/lib/validation"

export async function GET(request: Request) {
  const { error } = await requireAuth(request)
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get("cursor")
    const limit = Number(searchParams.get("limit")) || undefined
    const result = await getProductsPaginated({ cursor, take: limit })
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "Erro ao listar produtos" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { error } = await requireAuth(request, "OPERACIONAL")
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
