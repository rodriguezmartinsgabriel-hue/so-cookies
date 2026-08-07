import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { isMercadoPagoConfigured } from "@/lib/payments/config"
import { logger } from "@/lib/logger"
import { PaymentStatus } from "@/generated/prisma/enums"

type CheckResult = {
  status: "ok" | "error" | "not_configured"
  latency_ms?: number
  detail?: string
}

const results: Record<string, CheckResult> = {}

async function checkDatabase(): Promise<void> {
  const start = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    results.database = { status: "ok", latency_ms: Date.now() - start }
  } catch (e) {
    logger.error("[health] check de banco falhou", undefined, e)
    results.database = {
      status: "error",
      detail: e instanceof Error ? e.message : String(e),
      latency_ms: Date.now() - start,
    }
  }
}

async function checkMigrations(): Promise<void> {
  const start = Date.now()
  try {
    const rows = await prisma.$queryRaw<{ total: number; last_finished: Date | null }[]>`
      SELECT COUNT(*) AS total, MAX("finished_at") AS last_finished
      FROM "_prisma_migrations"
      WHERE "finished_at" IS NOT NULL
    `
    const row = rows[0]
    results.migrations = {
      status: "ok",
      latency_ms: Date.now() - start,
      detail: `aplicadas: ${row?.total ?? 0}; última: ${row?.last_finished ? row.last_finished.toISOString() : "n/a"}`,
    }
  } catch (e) {
    logger.error("[health] check de migrations falhou", undefined, e)
    results.migrations = {
      status: "error",
      detail: e instanceof Error ? e.message : String(e),
      latency_ms: Date.now() - start,
    }
  }
}

async function checkMercadoPago(): Promise<void> {
  if (!isMercadoPagoConfigured()) {
    results.mercadopago = { status: "not_configured", detail: "MERCADO_PAGO_ACCESS_TOKEN não definido" }
    return
  }
  const start = Date.now()
  try {
    const res = await fetch("https://api.mercadopago.com/users/me", {
      headers: { Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}` },
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    })
    if (!res.ok) {
      results.mercadopago = { status: "error", detail: `HTTP ${res.status}`, latency_ms: Date.now() - start }
      return
    }
    results.mercadopago = { status: "ok", latency_ms: Date.now() - start }
  } catch (e) {
    results.mercadopago = {
      status: "error",
      detail: e instanceof Error ? e.message : String(e),
      latency_ms: Date.now() - start,
    }
  }
}

async function checkIntegrations(): Promise<void> {
  const start = Date.now()
  try {
    const accounts = await prisma.integrationAccount.groupBy({
      by: ["platform"],
      where: { enabled: true },
      _count: { platform: true },
    })
    const summary = accounts.map((a) => `${a.platform}:${a._count.platform}`).join(", ") || "nenhuma"
    results.integrations = { status: "ok", latency_ms: Date.now() - start, detail: summary }
  } catch (e) {
    results.integrations = {
      status: "error",
      detail: e instanceof Error ? e.message : String(e),
      latency_ms: Date.now() - start,
    }
  }
}

function checkStorage(): void {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    results.storage = { status: "not_configured", detail: "SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não definidos" }
    return
  }
  results.storage = { status: "ok", detail: "configurado" }
}

async function checkPaymentMetrics(): Promise<void> {
  if (!isMercadoPagoConfigured()) {
    results.paymentMetrics = { status: "not_configured", detail: "Mercado Pago não configurado" }
    return
  }
  const start = Date.now()
  try {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const [totalPending, totalPaid, totalExpired, lastPayment] = await Promise.all([
      prisma.order.count({ where: { paymentStatus: PaymentStatus.AGUARDANDO_PAGAMENTO } }),
      prisma.order.count({ where: { paymentStatus: PaymentStatus.PAGO, paidAt: { gte: last24h } } }),
      prisma.order.count({ where: { paymentStatus: PaymentStatus.EXPIRADO, updatedAt: { gte: last24h } } }),
      prisma.order.findFirst({
        where: { paymentStatus: PaymentStatus.PAGO },
        orderBy: { paidAt: "desc" },
        select: { paidAt: true },
      }),
    ])
    results.paymentMetrics = {
      status: "ok",
      latency_ms: Date.now() - start,
      detail: `pendentes: ${totalPending}; pagos (24h): ${totalPaid}; expirados (24h): ${totalExpired}; último pagamento: ${lastPayment?.paidAt?.toISOString() ?? "n/a"}`,
    }
  } catch (e) {
    results.paymentMetrics = {
      status: "error",
      detail: e instanceof Error ? e.message : String(e),
      latency_ms: Date.now() - start,
    }
  }
}

export async function GET() {
  await Promise.all([checkDatabase(), checkMigrations(), checkMercadoPago(), checkIntegrations(), checkPaymentMetrics()])
  checkStorage()

  const requiredOk = results.database?.status === "ok"
  const overall = requiredOk ? "healthy" : "degraded"

  return NextResponse.json(
    {
      status: overall,
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.round(process.uptime()),
      runtime: { node: process.version },
      deployment: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      checks: results,
    },
    { status: requiredOk ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  )
}
