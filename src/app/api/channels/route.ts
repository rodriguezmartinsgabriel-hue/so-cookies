import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { createChannelSchema } from "@/lib/validation"

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error
  try {
    const data = await prisma.saleChannel.findMany()
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: "Erro ao buscar canais" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { error } = await requireAuth("ADMIN")
  if (error) return error
  try {
    const json = await request.json()
    const parsed = createChannelSchema.parse(json)
    const data = await prisma.saleChannel.create({ data: parsed })
    return NextResponse.json(data)
  } catch (e: any) {
    if (e?.issues) {
      return NextResponse.json({ error: "Dados inválidos", details: e.issues }, { status: 400 })
    }
    return NextResponse.json({ error: "Erro ao criar canal" }, { status: 500 })
  }
}
