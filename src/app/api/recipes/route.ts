import { NextResponse } from "next/server";
import { getRecipes, createRecipe } from "@/lib/db";

export async function GET() {
  try {
    const recipes = await getRecipes();
    return NextResponse.json(recipes);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch recipes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const recipe = await createRecipe(data);
    return NextResponse.json(recipe);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create recipe" }, { status: 500 });
  }
}
