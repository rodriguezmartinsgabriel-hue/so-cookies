import { prisma } from "@/lib/prisma"

export async function recordSyncDelete(entity: string, recordId: string) {
  try {
    await prisma.syncDelete.upsert({
      where: { entity_recordId: { entity, recordId } },
      update: {},
      create: { entity, recordId },
    })
  } catch (e) {
    console.error("Falha ao registrar exclusão:", e)
  }
}
