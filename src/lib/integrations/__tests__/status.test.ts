import { describe, it, expect } from "vitest"
import {
  mapExternalToInternal,
  statusFromIfoodEvent,
  statusFromOpenDeliveryEvent,
  externalStatusFromIfoodEvent,
} from "@/lib/integrations/status"

describe("status 99Food (Open Delivery)", () => {
  it("mapeia ciclo de vida completo", () => {
    expect(mapExternalToInternal("99FOOD", "CREATED")).toBe("PENDENTE")
    expect(mapExternalToInternal("99FOOD", "CONFIRMED")).toBe("CONFIRMADO")
    expect(mapExternalToInternal("99FOOD", "PREPARING")).toBe("PRODUCAO")
    expect(mapExternalToInternal("99FOOD", "READY_FOR_PICKUP")).toBe("PRONTO")
    expect(mapExternalToInternal("99FOOD", "DISPATCHED")).toBe("ENTREGA")
    expect(mapExternalToInternal("99FOOD", "DELIVERED")).toBe("CONCLUIDO")
    expect(mapExternalToInternal("99FOOD", "CONCLUDED")).toBe("CONCLUIDO")
    expect(mapExternalToInternal("99FOOD", "CANCELLED")).toBe("CANCELADO")
  })

  it("desconhecido cai em PENDENTE", () => {
    expect(mapExternalToInternal("99FOOD", "XABLAU")).toBe("PENDENTE")
  })

  it("eventType do webhook é interpretado", () => {
    expect(statusFromOpenDeliveryEvent("READY_FOR_PICKUP")).toBe("PRONTO")
    expect(statusFromOpenDeliveryEvent("ORDER_CANCELLATION_REQUEST")).toBe("PENDENTE")
  })
})

describe("status iFood", () => {
  it("mapeia status do pedido", () => {
    expect(mapExternalToInternal("IFOOD", "PLACED")).toBe("PENDENTE")
    expect(mapExternalToInternal("IFOOD", "CONFIRMED")).toBe("CONFIRMADO")
    expect(mapExternalToInternal("IFOOD", "IN_PREPARATION")).toBe("PRODUCAO")
    expect(mapExternalToInternal("IFOOD", "READY_TO_PICKUP")).toBe("PRONTO")
    expect(mapExternalToInternal("IFOOD", "DISPATCHED")).toBe("ENTREGA")
    expect(mapExternalToInternal("IFOOD", "DELIVERED")).toBe("CONCLUIDO")
    expect(mapExternalToInternal("IFOOD", "CANCELLED")).toBe("CANCELADO")
  })

  it("deriva status do código do evento (indiferente a caixa/separadores)", () => {
    expect(statusFromIfoodEvent("order/requests/create")).toBe("PENDENTE")
    expect(statusFromIfoodEvent("order/status/READY_TO_PICKUP")).toBe("PRONTO")
    expect(statusFromIfoodEvent("order/status/dispatch")).toBe("ENTREGA")
    expect(statusFromIfoodEvent("order.status.concluded")).toBe("CONCLUIDO")
    expect(statusFromIfoodEvent("order/cancellation/confirmed")).toBe("CANCELADO")
    expect(statusFromIfoodEvent("evento/desconhecido")).toBe("PENDENTE")
  })

  it("expõe status externo para armazenar em externalStatus", () => {
    expect(externalStatusFromIfoodEvent("order/requests/create")).toBe("PLACED")
    expect(externalStatusFromIfoodEvent("order/status/readyToPickup")).toBe("READY_TO_PICKUP")
    expect(externalStatusFromIfoodEvent("desconhecido")).toBe("PLACED")
  })
})
