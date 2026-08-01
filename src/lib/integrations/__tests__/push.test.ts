import { describe, it, expect, beforeEach, vi } from "vitest"
import { pushOperationForStatus, expectedExternalStatus } from "@/lib/integrations/push"

describe("push mapping", () => {
  it("mapeia status interno para operação de push (99Food)", () => {
    expect(pushOperationForStatus("99FOOD", "CONFIRMADO")).toBe("confirm")
    expect(pushOperationForStatus("99FOOD", "PRODUCAO")).toBe("startPreparation")
    expect(pushOperationForStatus("99FOOD", "PRONTO")).toBe("readyForPickup")
    expect(pushOperationForStatus("99FOOD", "ENTREGA")).toBe("startDelivery")
  })

  it("mapeia status interno para operação de push (iFood)", () => {
    expect(pushOperationForStatus("IFOOD", "CONFIRMADO")).toBe("acknowledgment")
    expect(pushOperationForStatus("IFOOD", "PRONTO")).toBe("readyToPickup")
    expect(pushOperationForStatus("IFOOD", "ENTREGA")).toBe("dispatch")
  })

  it("não empurra PENDENTE, CONCLUIDO ou CANCELADO", () => {
    expect(pushOperationForStatus("99FOOD", "PENDENTE")).toBeNull()
    expect(pushOperationForStatus("IFOOD", "CONCLUIDO")).toBeNull()
    expect(pushOperationForStatus("IFOOD", "CANCELADO")).toBeNull()
  })

  it("deriva externalStatus esperado", () => {
    expect(expectedExternalStatus("99FOOD", "CONFIRMADO")).toBe("CONFIRMED")
    expect(expectedExternalStatus("IFOOD", "PRONTO")).toBe("READY_TO_PICKUP")
    expect(expectedExternalStatus("99FOOD", "CANCELADO")).toBe("CANCELLED")
    expect(expectedExternalStatus("IFOOD", "DESCONHECIDO")).toBeNull()
  })
})
