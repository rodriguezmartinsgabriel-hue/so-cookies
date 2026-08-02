import { NextResponse } from "next/server"
import { requireCustomer, customerSafeSelect } from "@/lib/customer-auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const { error, customer } = await requireCustomer()
  if (error) return error
  const safe = await prisma.customer.findUnique({
    where: { id: customer.id },
    select: customerSafeSelect,
  })
  return NextResponse.json(safe)
}
