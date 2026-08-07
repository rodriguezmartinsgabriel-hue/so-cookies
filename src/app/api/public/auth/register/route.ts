import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hash } from "bcryptjs"
import { setCustomerCookie, customerSafeSelect } from "@/lib/customer-auth"
import { syncCustomerToContact } from "@/lib/customer-contact"
import { registerCustomerSchema, getZodIssues } from "@/lib/validation"
import { rateLimit } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"

export async function POST(request: Request) {
  const limited = rateLimit(request, 5, 60_000)
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente em instantes." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
    )
  }
  try {
    const json = await request.json()
    const parsed = registerCustomerSchema.parse(json)
    const existing = await prisma.customer.findUnique({ where: { email: parsed.email } })
    if (existing) {
      return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 })
    }
    const password = await hash(parsed.password, 10)
    const customer = await prisma.customer.create({
      data: { name: parsed.name, email: parsed.email, phone: parsed.phone || null, password },
      select: customerSafeSelect,
    })
    await setCustomerCookie(customer.id)
    try {
      await syncCustomerToContact({
        id: customer.id,
        name: parsed.name,
        email: parsed.email,
        phone: parsed.phone || null,
      })
    } catch (e) {
      logger.error("Falha ao sincronizar contato do cliente", { customerId: customer.id }, e)
    }
    return NextResponse.json(customer, { status: 201 })
  } catch (e) {
    const issues = getZodIssues(e)
    if (issues) {
      return NextResponse.json({ error: "Dados inválidos", details: issues }, { status: 400 })
    }
    return NextResponse.json({ error: "Erro ao criar conta" }, { status: 500 })
  }
}
