import { NextResponse } from "next/server"
import { getCashFlow, createCashEntry } from "@/lib/db"

export async function GET() {
  const entries = await getCashFlow()
  return NextResponse.json(entries)
}

export async function POST(request: Request) {
  const data = await request.json()
  const entry = await createCashEntry(data)
  return NextResponse.json(entry)
}
