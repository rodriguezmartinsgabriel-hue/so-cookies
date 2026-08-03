import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"
import { runLazyReconcile } from "@/lib/integrations/reconcile"

export async function POST() {
  const { error } = await requireAuth("OPERACIONAL")
  if (error) return error
  try {
    await runLazyReconcile()
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
