import { NextResponse } from "next/server"
import { getProductions, createProduction } from "@/lib/db"

export async function GET() {
  const productions = await getProductions()
  return NextResponse.json(productions)
}

export async function POST(request: Request) {
  const data = await request.json()
  const production = await createProduction(data)
  return NextResponse.json(production)
}
