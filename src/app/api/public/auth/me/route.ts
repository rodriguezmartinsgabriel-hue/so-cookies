import { NextResponse } from "next/server"
import { requireCustomer, customerSafeSelect } from "@/lib/customer-auth"
import { prisma } from "@/lib/prisma"
import { compare, hash } from "bcryptjs"
import { updateCustomerProfileSchema, getZodIssues } from "@/lib/validation"
import { rateLimit } from "@/lib/rate-limit"

export async function GET() {
  const { error, customer } = await requireCustomer()
  if (error) return error
  const safe = await prisma.customer.findUnique({
    where: { id: customer.id },
    select: { ...customerSafeSelect, password: true },
  })
  if (!safe) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })
  const { password, ...rest } = safe
  return NextResponse.json({ ...rest, hasPassword: !!password })
}

export async function PATCH(request: Request) {
  const { error, customer } = await requireCustomer()
  if (error) return error
  const limited = rateLimit(request, 10, 60_000)
  if (!limited.ok) {
    return NextResponse.json({ error: "Muitas tentativas. Tente novamente em instantes." }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } })
  }
  try {
    const json = await request.json()
    const parsed = updateCustomerProfileSchema.parse(json)

    const data: Record<string, unknown> = {}
    if (parsed.name !== undefined) data.name = parsed.name
    if (parsed.phone !== undefined) data.phone = parsed.phone || null
    for (const field of ["addressCep", "addressStreet", "addressNumber", "addressComplement", "addressNeighborhood", "addressCity", "addressState"] as const) {
      if (parsed[field] !== undefined) data[field] = parsed[field] || null
    }

    if (parsed.newPassword) {
      const full = await prisma.customer.findUnique({
        where: { id: customer.id },
        select: { password: true },
      })
      if (!full?.password) {
        return NextResponse.json({ error: "Esta conta usa login com Google. Não é possível alterar a senha." }, { status: 400 })
      }
      const valid = await compare(parsed.currentPassword!, full.password)
      if (!valid) {
        return NextResponse.json({ error: "Senha atual incorreta" }, { status: 400 })
      }
      data.password = await hash(parsed.newPassword, 10)
    }

    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data,
      select: customerSafeSelect,
    })
    return NextResponse.json(updated)
  } catch (e) {
    const issues = getZodIssues(e)
    if (issues) {
      return NextResponse.json({ error: "Dados inválidos", details: issues }, { status: 400 })
    }
    return NextResponse.json({ error: "Erro ao atualizar perfil" }, { status: 500 })
  }
}
