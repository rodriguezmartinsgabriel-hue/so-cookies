import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { requireAuth } from "@/lib/api-auth"
import { getUsers, createUser, getUserByEmail } from "@/lib/db"
import { createUserSchema, getZodIssues } from "@/lib/validation"

export async function GET(request: Request) {
  const { error } = await requireAuth(request, "ADMIN")
  if (error) return error
  try {
    const users = await getUsers()
    return NextResponse.json(users)
  } catch {
    return NextResponse.json({ error: "Erro ao buscar usuários" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { error } = await requireAuth(request, "ADMIN")
  if (error) return error
  try {
    const json = await request.json()
    const parsed = createUserSchema.parse(json)
    const existing = await getUserByEmail(parsed.email)
    if (existing) {
      return NextResponse.json({ error: "Já existe um usuário com este e-mail" }, { status: 409 })
    }
    const password = await hash(parsed.password, 10)
    const user = await createUser({ ...parsed, password })
    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    })
  } catch (e) {
    const issues = getZodIssues(e)
    if (issues) {
      return NextResponse.json({ error: "Dados inválidos", details: issues }, { status: 400 })
    }
    return NextResponse.json({ error: "Erro ao criar usuário" }, { status: 500 })
  }
}
