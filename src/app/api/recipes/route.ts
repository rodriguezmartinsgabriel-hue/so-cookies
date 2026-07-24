import { NextResponse } from "next/server"
import { getRecipes } from "@/lib/db"

export async function GET() {
  const recipes = await getRecipes()
  return NextResponse.json(recipes)
}
