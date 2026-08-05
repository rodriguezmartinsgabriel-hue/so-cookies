import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"
import { getContacts, createContact } from "@/lib/db"
import { createContactSchema, getZodIssues } from "@/lib/validation"

export async function GET(request: Request) {
  const { error } = await requireAuth(request)
  if (error) return error
  try {
    const url = new URL(request.url)
    const search = url.searchParams.get("search") || undefined
    const type = url.searchParams.get("type") || undefined
    const data = await getContacts(search, type)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Erro ao buscar contatos" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { error } = await requireAuth(request, "OPERACIONAL")
  if (error) return error
  try {
    const json = await request.json()
    const parsed = createContactSchema.parse(json)
    const data = await createContact(parsed)
    return NextResponse.json(data)
  } catch (e) {
    const issues = getZodIssues(e)
    if (issues) {
      return NextResponse.json({ error: "Dados inválidos", details: issues }, { status: 400 })
    }
    return NextResponse.json({ error: "Erro ao criar contato" }, { status: 500 })
  }
}
