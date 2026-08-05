import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { CheckoutStepper } from "./CheckoutStepper"

describe("CheckoutStepper", () => {
  it("renderiza 3 passos", () => {
    render(<CheckoutStepper current={1} onStep={() => {}} />)
    expect(screen.getByText("Carrinho")).toBeInTheDocument()
    expect(screen.getByText("Entrega")).toBeInTheDocument()
    expect(screen.getByText("Revisar")).toBeInTheDocument()
  })

  it("highlight no passo atual", () => {
    render(<CheckoutStepper current={2} onStep={() => {}} />)
    const stepSpans = screen.getAllByRole("button").map((btn) => btn.querySelector("span"))
    expect(stepSpans[1]).toHaveClass("bg-ink")
  })

  it("passos anteriores são clicáveis", () => {
    render(<CheckoutStepper current={3} onStep={() => {}} />)
    const steps = screen.getAllByRole("button")
    expect(steps[0]).not.toHaveClass("cursor-default")
    expect(steps[1]).not.toHaveClass("cursor-default")
  })

  it("passo atual tem cursor-pointer", () => {
    render(<CheckoutStepper current={2} onStep={() => {}} />)
    const steps = screen.getAllByRole("button")
    expect(steps[1]).toHaveClass("cursor-pointer")
  })
})