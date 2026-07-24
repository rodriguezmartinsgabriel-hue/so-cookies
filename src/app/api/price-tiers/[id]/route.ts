import { NextResponse } from "next/server";
import { updatePriceTier, deletePriceTier } from "@/lib/db";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    const tier = await updatePriceTier(id, data);
    return NextResponse.json(tier);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update price tier" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deletePriceTier(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete price tier" }, { status: 500 });
  }
}
