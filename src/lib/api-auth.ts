import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export type Role = "ADMIN" | "OPERACIONAL" | "VISUALIZADOR"

export async function requireAuth(minRole?: Role) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }), session: null }
  }
  if (minRole && session.user.role) {
    const hierarchy: Record<Role, number> = { ADMIN: 3, OPERACIONAL: 2, VISUALIZADOR: 1 }
    const userLevel = hierarchy[session.user.role as Role] || 0
    const requiredLevel = hierarchy[minRole] || 0
    if (userLevel < requiredLevel) {
      return { error: NextResponse.json({ error: "Sem permissão" }, { status: 403 }), session: null }
    }
  }
  return { error: null, session }
}
