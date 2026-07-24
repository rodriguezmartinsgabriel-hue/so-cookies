import { NextResponse } from "next/server";
import { getIngredients, createIngredient } from "@/lib/db";

export async function GET() {
  try {
    const ingredients = await getIngredients();
    return NextResponse.json(ingredients);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch ingredients" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const ingredient = await createIngredient(data);
    return NextResponse.json(ingredient);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create ingredient" }, { status: 500 });
  }
}
