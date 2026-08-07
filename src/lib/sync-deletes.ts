import { prisma } from "@/lib/prisma"
import { logger } from "./logger"

export async function recordSyncDelete(entity: string, recordId: string) {
  try {
    await prisma.syncDelete.upsert({
      where: { entity_recordId: { entity, recordId } },
      update: {},
      create: { entity, recordId },
    })
  } catch (e) {
    logger.error("Falha ao registrar exclusão", { entity, recordId }, e)
  }
}
