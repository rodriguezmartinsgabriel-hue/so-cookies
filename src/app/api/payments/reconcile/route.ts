import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"
import { reconcileAllPendingOrderPayments } from "@/lib/payments/service"
import { getClientIp, isIpAllowed } from "@/lib/ip-allowlist"
import { logger } from "@/lib/logger"

function isCronRequest(request: Request): boolean {
  return request.headers.get("user-agent")?.toLowerCase().includes("vercel") === true
}

function hasCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = request.headers.get("authorization") || ""
  return auth === `Bearer ${secret}`
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
  if (hasCronSecret(request)) {
    return execute()
  }

  const allowlist = process.env.RECONCILE_IP_ALLOWLIST
  if (allowlist) {
    const ip = getClientIp(request)
    if (!ip || !isIpAllowed(ip, allowlist)) {
      return NextResponse.json({ error: "IP não autorizado" }, { status: 403 })
    }
    return execute()
  }

  const { error } = await requireAuth(request, "OPERACIONAL")
  if (error) return error
  return execute()
}

async function execute() {
  try {
    const result = await reconcileAllPendingOrderPayments()
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    logger.error("[payments] falha na reconciliação ativa", undefined, e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
