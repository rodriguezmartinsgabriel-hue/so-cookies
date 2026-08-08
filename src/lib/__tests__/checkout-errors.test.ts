import { describe, it, expect } from "vitest"
import { checkoutErrorMessage } from "@/lib/checkout-errors"

describe("checkoutErrorMessage", () => {
  it("usa o fallback para códigos desconhecidos ou nulos", () => {
    expect(checkoutErrorMessage(null, "fallback")).toBe("fallback")
    expect(checkoutErrorMessage(undefined, "fallback")).toBe("fallback")
    expect(checkoutErrorMessage("DESCONHECIDO", "fallback")).toBe("fallback")
  })

  it("mapeia NO_PAYER_EMAIL", () => {
    expect(checkoutErrorMessage("NO_PAYER_EMAIL", "fallback")).toContain("e-mail")
  })

  it("mapeia PAYMENTS_DISABLED", () => {
    expect(checkoutErrorMessage("PAYMENTS_DISABLED", "fallback")).toContain("indisponível")
  })

  it("mapeia PRICE_CHANGED", () => {
    expect(checkoutErrorMessage("PRICE_CHANGED", "fallback")).toContain("mudou")
  })

  it("mapeia INVALID_AMOUNT", () => {
    expect(checkoutErrorMessage("INVALID_AMOUNT", "fallback")).toContain("inválido")
  })

  it("mapeia PROVIDER_AUTH_ERROR e PROVIDER_ERROR", () => {
    expect(checkoutErrorMessage("PROVIDER_AUTH_ERROR", "fallback")).toContain("pagamento")
    expect(checkoutErrorMessage("PROVIDER_ERROR", "fallback")).toContain("pagamento")
  })
})
