import { prisma } from "@/lib/prisma"
import { fetchIfoodOrder } from "./clients/ifood"
import { fetchNineFoodOrder } from "./clients/ninefood"
import { normalizeOrder } from "./normalize"
import { upsertOrder } from "./orders"
import { externalStatusFromIfoodEvent, mapExternalToInternal } from "./status"
import type { AccountRecord, InboundOrderEvent, Platform } from "./types"

export type InboundEventResult = {
  duplicate: boolean
  internalStatus?: string
}

export async function processInboundOrderEvent(input: {
  platform: Platform
  account: AccountRecord
  event: InboundOrderEvent
}): Promise<InboundEventResult> {
  const { platform, account, event } = input

  const existing = await prisma.inboundEvent.findUnique({
    where: { platform_eventId: { platform, eventId: event.eventId } },
  })
  if (existing && existing.status !== "ERROR") return { duplicate: true }

  const record = existing
    ? await prisma.inboundEvent.update({
        where: { id: existing.id },
        data: { status: "RECEIVED", error: null },
      })
    : await prisma.inboundEvent.create({
        data: {
          platform,
          eventId: event.eventId,
          type: event.eventType,
          payload: JSON.stringify(event),
          status: "RECEIVED",
        },
      })

  try {
    const internalStatus = await applyOrderFromEvent({ platform, account, event })
    await prisma.inboundEvent.update({
      where: { id: record.id },
      data: { status: "PROCESSED", orderId: event.orderId, processedAt: new Date() },
    })
    return { duplicate: false, internalStatus }
  } catch (e) {
    await prisma.inboundEvent.update({
      where: { id: record.id },
      data: { status: "ERROR", error: String(e && typeof e === "object" && "message" in e ? e.message : e) },
    })
    throw e
  }
}

async function applyOrderFromEvent(input: {
  platform: Platform
  account: AccountRecord
  event: InboundOrderEvent
}): Promise<string> {
  const { platform, account, event } = input

  const details =
    platform === "99FOOD"
      ? event.orderUrl
        ? await fetchNineFoodOrder(account, event.orderUrl)
        : null
      : await fetchIfoodOrder(account, event.orderId)

  if (!details) throw new Error("Detalhes do pedido indisponíveis")

  const externalStatus =
    platform === "99FOOD"
      ? String(event.eventType || details?.lastEvent || "CREATED").toUpperCase()
      : String(details?.status || externalStatusFromIfoodEvent(event.eventType)).toUpperCase()

  const internalStatus = mapExternalToInternal(platform, externalStatus)
  const normalized = normalizeOrder(platform, details)
  const externalId = normalized.externalId || event.orderId
  if (!externalId) throw new Error("Pedido sem identificador externo")

  await upsertOrder({ platform, externalId, externalStatus, internalStatus, order: normalized })
  return internalStatus
}
