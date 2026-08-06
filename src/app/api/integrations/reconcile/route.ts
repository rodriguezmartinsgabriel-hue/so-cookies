import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"
import { runLazyReconcile } from "@/lib/integrations/reconcile"
import { getClientIp, isIpAllowed } from "@/lib/ip-allowlist"

function isCronRequest(request: Request): boolean {
  return request.headers.get("user-agent")?.toLowerCase().includes("vercel") === true
}

export async function GET(request: Request) {
  return runWithAuth(request)
}

export async function POST(request: Request) {
  if (isCronRequest(request)) {
    return NextResponse.json({ error: "Método não suportado para cron" }, { status: 405 })
  }
  return runWithAuth(request)
}

async function runWithAuth(request: Request) {
  const allowlist = process.env.RECONCILE_IP_ALLOWLIST
  if (allowlist) {
    const ip = getClientIp(request)
    if (!ip || !isIpAllowed(ip, allowlist)) {
      return NextResponse.json({ error: "IP não autorizado" }, { status: 403 })
    }
  } else {
    const { error } = await requireAuth(request, "OPERACIONAL")
    if (error) return error
  }
  try {
    await runLazyReconcile()
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
