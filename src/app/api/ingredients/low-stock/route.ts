import { NextResponse } from "next/server";
import { getLowStock } from "@/lib/db";

export async function GET() {
  try {
    const lowStock = await getLowStock();
    return NextResponse.json(lowStock);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch low stock" }, { status: 500 });
  }
}
