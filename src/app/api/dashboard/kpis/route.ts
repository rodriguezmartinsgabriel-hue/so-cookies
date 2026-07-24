import { NextResponse } from "next/server";
import { getDashboardKpis } from "@/lib/db";

export async function GET() {
  try {
    const kpis = await getDashboardKpis();
    return NextResponse.json(kpis);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch KPIs" }, { status: 500 });
  }
}
