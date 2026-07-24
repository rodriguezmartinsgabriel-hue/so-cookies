import { NextResponse } from "next/server";
import { getIngredient, updateIngredient, deleteIngredient } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ingredient = await getIngredient(id);
    if (!ingredient) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(ingredient);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch ingredient" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    const ingredient = await updateIngredient(id, data);
    return NextResponse.json(ingredient);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update ingredient" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteIngredient(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete ingredient" }, { status: 500 });
  }
}
