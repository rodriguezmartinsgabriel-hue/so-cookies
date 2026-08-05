import { NextResponse } from "next/server"
import { getDashboardKpis } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"

export async function GET(request: Request) {
  const { error } = await requireAuth(request)
  if (error) return error
  try {
    const kpis = await getDashboardKpis()
    return NextResponse.json(kpis)
  } catch {
    return NextResponse.json({ error: "Erro ao buscar KPIs" }, { status: 500 })
  }
}
