import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"
import { getContacts, createContact } from "@/lib/db"
import { createContactSchema } from "@/lib/validation"

export async function GET(request: Request) {
  const { error } = await requireAuth()
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
  const { error } = await requireAuth("OPERACIONAL")
  if (error) return error
  try {
    const json = await request.json()
    const parsed = createContactSchema.parse(json)
    const data = await createContact(parsed)
    return NextResponse.json(data)
  } catch (e: any) {
    if (e?.issues) {
      return NextResponse.json({ error: "Dados inválidos", details: e.issues }, { status: 400 })
    }
    return NextResponse.json({ error: "Erro ao criar contato" }, { status: 500 })
  }
}
