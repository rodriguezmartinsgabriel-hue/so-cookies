import type { Platform } from "./types"

const OPEN_DELIVERY_STATUS: Record<string, string> = {
  CREATED: "PENDENTE",
  CONFIRMED: "CONFIRMADO",
  PREPARATION_REQUESTED: "PRODUCAO",
  PREPARING: "PRODUCAO",
  READY_FOR_PICKUP: "PRONTO",
  DISPATCHED: "ENTREGA",
  PICKED_UP: "ENTREGA",
  DELIVERED: "CONCLUIDO",
  CONCLUDED: "CONCLUIDO",
  CANCELLED: "CANCELADO",
}

const IFOOD_STATUS: Record<string, string> = {
  PLACED: "PENDENTE",
  CONFIRMED: "CONFIRMADO",
  IN_PREPARATION: "PRODUCAO",
  PREPARING: "PRODUCAO",
  READY_TO_PICKUP: "PRONTO",
  DISPATCHED: "ENTREGA",
  DELIVERED: "CONCLUIDO",
  CONCLUDED: "CONCLUIDO",
  CANCELLED: "CANCELADO",
  REQUESTED_CANCELLATION: "PENDENTE",
}

const IFOOD_EVENT_CODE: Record<string, string> = {
  orderrequestscreate: "PLACED",
  orderstatusconfirmed: "CONFIRMED",
  orderstatusinpreparation: "IN_PREPARATION",
  orderstatuspreparing: "PREPARING",
  orderstatusreadytopickup: "READY_TO_PICKUP",
  orderstatusdispatch: "DISPATCHED",
  orderstatusdelivery: "DELIVERED",
  orderstatusconcluded: "CONCLUDED",
  orderstatuscancelled: "CANCELLED",
  ordercancellationrequested: "REQUESTED_CANCELLATION",
  ordercancellationconfirmed: "CANCELLED",
}

function normalizeEventCode(code: string): string {
  return code.toLowerCase().replace(/[^a-z0-9]/g, "")
}

export function mapExternalToInternal(platform: Platform, externalStatus: string): string {
  const map = platform === "99FOOD" ? OPEN_DELIVERY_STATUS : IFOOD_STATUS
  return map[externalStatus] || "PENDENTE"
}

export function statusFromIfoodEvent(code: string): string {
  return mapExternalToInternal("IFOOD", externalStatusFromIfoodEvent(code))
}

export function externalStatusFromIfoodEvent(code: string): string {
  const normalized = normalizeEventCode(code)
  return IFOOD_EVENT_CODE[normalized] || "PLACED"
}

export function statusFromOpenDeliveryEvent(eventType: string): string {
  return mapExternalToInternal("99FOOD", eventType)
}
