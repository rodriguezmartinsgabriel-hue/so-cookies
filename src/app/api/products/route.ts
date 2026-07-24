import { NextResponse } from "next/server"
import { getProducts, createProduct } from "@/lib/db"

export async function GET() {
  const products = await getProducts()
  return NextResponse.json(products)
}

export async function POST(request: Request) {
  const data = await request.json()
  const product = await createProduct(data)
  return NextResponse.json(product)
}
