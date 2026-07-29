import { NextResponse } from "next/server"
import { getDashboardKpis } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error
  try {
    const kpis = await getDashboardKpis()
    return NextResponse.json(kpis)
  } catch (e) {
    return NextResponse.json({ error: "Erro ao buscar KPIs" }, { status: 500 })
  }
}
