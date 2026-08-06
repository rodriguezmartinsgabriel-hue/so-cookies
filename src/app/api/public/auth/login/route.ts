import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { compare } from "bcryptjs"
import { setCustomerCookie, customerSafeSelect } from "@/lib/customer-auth"
import { loginCustomerSchema, getZodIssues } from "@/lib/validation"
import { rateLimit } from "@/lib/rate-limit"

export async function POST(request: Request) {
  const limited = rateLimit(request, 10, 60_000)
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente em instantes." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
    )
  }
  try {
    const json = await request.json()
    const parsed = loginCustomerSchema.parse(json)
    const customer = await prisma.customer.findUnique({ where: { email: parsed.email } })
    if (!customer) {
      return NextResponse.json({ error: "E-mail ou senha inválidos" }, { status: 401 })
    }
    if (!customer.password) {
      return NextResponse.json({ error: "Esta conta usa login com Google. Entre com o Google." }, { status: 401 })
    }
    const valid = await compare(parsed.password, customer.password)
    if (!valid) {
      return NextResponse.json({ error: "E-mail ou senha inválidos" }, { status: 401 })
    }
    const safe = await prisma.customer.findUnique({
      where: { id: customer.id },
      select: customerSafeSelect,
    })
    await setCustomerCookie(customer.id)
    return NextResponse.json(safe)
  } catch (e) {
    const issues = getZodIssues(e)
    if (issues) {
      return NextResponse.json({ error: "Dados inválidos", details: issues }, { status: 400 })
    }
    return NextResponse.json({ error: "Erro ao entrar" }, { status: 500 })
  }
}
