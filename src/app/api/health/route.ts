import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const results: Record<string, { status: "ok" | "error"; latency_ms?: number; error?: string }> = {}

  const start = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    results.database = { status: "ok", latency_ms: Date.now() - start }
  } catch (e) {
    results.database = { status: "error", error: (e as Error).message, latency_ms: Date.now() - start }
  }

  const dbOk = results.database?.status === "ok"
  const overall = dbOk ? "healthy" : "degraded"

  return NextResponse.json(
    { status: overall, timestamp: new Date().toISOString(), checks: results },
    { status: dbOk ? 200 : 503 },
  )
}