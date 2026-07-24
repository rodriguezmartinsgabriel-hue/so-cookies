import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const updateData: Record<string, unknown> = { status: body.status }
  if (body.endTime) updateData.endTime = new Date(body.endTime)

  const production = await prisma.production.update({
    where: { id },
    data: updateData,
  })
  return NextResponse.json(production)
}
