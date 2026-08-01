import { prisma } from "@/lib/prisma"
import { getEnabledAccounts } from "./accounts"
import { updateNineFoodOrderStatus } from "./clients/ninefood"
import { updateIfoodOrderStatus } from "./clients/ifood"
import type { Platform } from "./types"

const PUSH_OPERATIONS: Record<Platform, Record<string, string>> = {
  "99FOOD": {
    CONFIRMADO: "confirm",
    PRODUCAO: "startPreparation",
    PRONTO: "readyForPickup",
    ENTREGA: "startDelivery",
  },
  IFOOD: {
    CONFIRMADO: "acknowledgment",
    PRODUCAO: "startPreparation",
    PRONTO: "readyToPickup",
    ENTREGA: "dispatch",
  },
}

const EXPECTED_EXTERNAL_STATUS: Record<Platform, Record<string, string>> = {
  "99FOOD": {
    PENDENTE: "CREATED",
    CONFIRMADO: "CONFIRMED",
    PRODUCAO: "PREPARING",
    PRONTO: "READY_FOR_PICKUP",
    ENTREGA: "DISPATCHED",
    CONCLUIDO: "CONCLUDED",
    CANCELADO: "CANCELLED",
  },
  IFOOD: {
    PENDENTE: "PLACED",
    CONFIRMADO: "CONFIRMED",
    PRODUCAO: "IN_PREPARATION",
    PRONTO: "READY_TO_PICKUP",
    ENTREGA: "DISPATCHED",
    CONCLUIDO: "DELIVERED",
    CANCELADO: "CANCELLED",
  },
}

export function pushOperationForStatus(platform: Platform, status: string): string | null {
  return PUSH_OPERATIONS[platform][status] || null
}

export function expectedExternalStatus(platform: Platform, status: string): string | null {
  return EXPECTED_EXTERNAL_STATUS[platform][status] || null
}

export type PushResult =
  | { pushed: false; reason: "sem-plataforma" | "sem-external-id" | "sem-conta" | "sem-operacao" }
  | { pushed: true; operation: string }

export async function pushOrderStatusToPlatform(orderId: string): Promise<PushResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, platform: true, externalId: true, status: true },
  })

  if (!order?.platform) return { pushed: false, reason: "sem-plataforma" }
  if (!order.externalId) return { pushed: false, reason: "sem-external-id" }

  const platform = order.platform as Platform
  const operation = pushOperationForStatus(platform, order.status)
  if (!operation) return { pushed: false, reason: "sem-operacao" }

  const accounts = await getEnabledAccounts(platform)
  const account = accounts[0]
  if (!account) return { pushed: false, reason: "sem-conta" }

  if (platform === "99FOOD") {
    await updateNineFoodOrderStatus(account, order.externalId, operation)
  } else {
    await updateIfoodOrderStatus(account, order.externalId, operation)
  }

  const external = expectedExternalStatus(platform, order.status)
  if (external) {
    await prisma.order.update({
      where: { id: order.id },
      data: { externalStatus: external, updatedAt: new Date() },
    })
  }

  return { pushed: true, operation }
}
