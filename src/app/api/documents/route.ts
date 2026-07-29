import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { createDocumentSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const { error } = await requireAuth()
  if (error) return error
  try {
    const { searchParams } = new URL(request.url);
    const categoryParam = searchParams.get("category")
    const documents = categoryParam && categoryParam !== "ALL"
      ? await prisma.document.findMany({ where: { category: categoryParam as any } })
      : await prisma.document.findMany()
    return NextResponse.json(documents);
  } catch (e) {
    return NextResponse.json({ error: "Erro ao buscar documentos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { error } = await requireAuth("OPERACIONAL")
  if (error) return error
  try {
    const json = await request.json();
    const parsed = createDocumentSchema.parse(json);
    const document = await prisma.document.create({ data: parsed });
    return NextResponse.json(document);
  } catch (e: any) {
    if (e?.issues) {
      return NextResponse.json({ error: "Dados inválidos", details: e.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro ao criar documento" }, { status: 500 });
  }
}
