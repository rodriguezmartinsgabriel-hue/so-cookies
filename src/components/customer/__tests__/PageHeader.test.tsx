import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { PageHeader } from "@/components/customer/PageHeader"

describe("PageHeader", () => {
  it("renderiza eyebrow, título display e subtítulo", () => {
    render(<PageHeader eyebrow="Carrinho" title="Finalize seu pedido" subtitle="Revise antes de finalizar" />)
    expect(screen.getByText("Carrinho")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 1, name: "Finalize seu pedido" })).toBeInTheDocument()
    expect(screen.getByText("Revise antes de finalizar")).toBeInTheDocument()
  })

  it("não renderiza subtítulo quando não fornecido", () => {
    render(<PageHeader eyebrow="Carrinho" title="Seu pedido" />)
    expect(screen.queryByText("Revise antes de finalizar")).toBeNull()
  })
})
