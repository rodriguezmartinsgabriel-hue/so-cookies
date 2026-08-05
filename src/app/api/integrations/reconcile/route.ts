import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"
import { runLazyReconcile } from "@/lib/integrations/reconcile"
import { getClientIp, isIpAllowed } from "@/lib/ip-allowlist"

export async function POST(request: Request) {
  const allowlist = process.env.RECONCILE_IP_ALLOWLIST
  if (allowlist) {
    const ip = getClientIp(request)
    if (!ip || !isIpAllowed(ip, allowlist)) {
      return NextResponse.json({ error: "IP não autorizado" }, { status: 403 })
    }
  }

  const { error } = await requireAuth(request, "OPERACIONAL")
  if (error) return error
  try {
    await runLazyReconcile()
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
