import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { createDocumentSchema, getZodIssues } from "@/lib/validation"
import type { DocumentCategory } from "@/generated/prisma/enums"

export async function GET(request: Request) {
  const { error } = await requireAuth(request)
  if (error) return error
  try {
    const { searchParams } = new URL(request.url)
    const categoryParam = searchParams.get("category")
    const documents =
      categoryParam && categoryParam !== "ALL"
        ? await prisma.document.findMany({ where: { category: categoryParam as DocumentCategory } })
        : await prisma.document.findMany()
    return NextResponse.json(documents)
  } catch {
    return NextResponse.json({ error: "Erro ao buscar documentos" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { error } = await requireAuth(request, "OPERACIONAL")
  if (error) return error
  try {
    const json = await request.json()
    const parsed = createDocumentSchema.parse(json)
    const document = await prisma.document.create({ data: parsed })
    return NextResponse.json(document)
  } catch (e) {
    const issues = getZodIssues(e)
    if (issues) {
      return NextResponse.json({ error: "Dados inválidos", details: issues }, { status: 400 })
    }
    return NextResponse.json({ error: "Erro ao criar documento" }, { status: 500 })
  }
}
