import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"
import { createAccount, listAccountsForAdmin, webhookUrlFor } from "@/lib/integrations/accounts"
import { accountCreateSchema } from "@/lib/integrations/validation"
import { getZodIssues } from "@/lib/validation"

export async function GET(request: Request) {
  const { error } = await requireAuth(request, "ADMIN")
  if (error) return error
  try {
    const origin = new URL(request.url).origin
    const accounts = await listAccountsForAdmin()
    return NextResponse.json(accounts.map((a) => ({ ...a, webhookUrl: webhookUrlFor(a.platform, origin) })))
  } catch (e) {
    const message = e && typeof e === "object" && "message" in e ? e.message : "Erro ao listar contas"
    return NextResponse.json({ error: String(message) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { error } = await requireAuth(request, "ADMIN")
  if (error) return error
  try {
    const json = await request.json()
    const parsed = accountCreateSchema.parse(json)
    const credentials = parsed.credentials
    const storeName = parsed.storeName
    const account = await createAccount({
      platform: parsed.platform,
      storeName,
      credentials,
      enabled: parsed.enabled ?? true,
    })
    return NextResponse.json(account)
  } catch (e) {
    const issues = getZodIssues(e)
    if (issues) {
      return NextResponse.json({ error: "Dados inválidos", details: issues }, { status: 400 })
    }
    if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
      return NextResponse.json({ error: "Já existe uma conta com esse nome de loja nesta plataforma" }, { status: 409 })
    }
    return NextResponse.json({ error: "Erro ao criar conta" }, { status: 500 })
  }
}
