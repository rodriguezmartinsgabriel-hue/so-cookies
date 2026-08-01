import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"
import { createAccount, listAccountsForAdmin, webhookUrlFor } from "@/lib/integrations/accounts"
import { accountCreateSchema } from "@/lib/integrations/validation"

export async function GET(request: Request) {
  const { error } = await requireAuth("ADMIN")
  if (error) return error
  try {
    const origin = new URL(request.url).origin
    const accounts = await listAccountsForAdmin()
    return NextResponse.json(
      accounts.map((a) => ({ ...a, webhookUrl: webhookUrlFor(a.platform, origin) })),
    )
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erro ao listar contas" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { error } = await requireAuth("ADMIN")
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
  } catch (e: any) {
    if (e?.issues) {
      return NextResponse.json({ error: "Dados inválidos", details: e.issues }, { status: 400 })
    }
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "Já existe uma conta com esse nome de loja nesta plataforma" }, { status: 409 })
    }
    return NextResponse.json({ error: "Erro ao criar conta" }, { status: 500 })
  }
}
