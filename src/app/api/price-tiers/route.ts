import { NextResponse } from "next/server";
import { getPriceTiers, createPriceTier } from "@/lib/db";

export async function GET() {
  try {
    const tiers = await getPriceTiers();
    return NextResponse.json(tiers);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch price tiers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const tier = await createPriceTier(data);
    return NextResponse.json(tier);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create price tier" }, { status: 500 });
  }
}
