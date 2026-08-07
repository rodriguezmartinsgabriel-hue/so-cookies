import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { ProfileInfoRow } from "@/components/customer/ProfileInfoRow"

describe("ProfileInfoRow", () => {
  it("renders label and value", () => {
    render(<ProfileInfoRow label="Telefone" value="(11) 99999-9999" />)
    expect(screen.getByText("Telefone")).toBeInTheDocument()
    expect(screen.getByText("(11) 99999-9999")).toBeInTheDocument()
  })

  it("mostra 'Não informado' quando value é undefined", () => {
    render(<ProfileInfoRow label="Endereço" />)
    expect(screen.getByText("Não informado")).toBeInTheDocument()
  })

  it("mostra 'Não informado' quando value é vazio", () => {
    render(<ProfileInfoRow label="Complemento" value="" />)
    expect(screen.getByText("Não informado")).toBeInTheDocument()
  })

  it("aceita ReactNode como value (ex: chip)", () => {
    render(<ProfileInfoRow label="Tag" value={<span data-testid="chip">VIP</span>} />)
    expect(screen.getByTestId("chip")).toHaveTextContent("VIP")
  })

  it("aplica className customizada", () => {
    const { container } = render(<ProfileInfoRow label="X" value="y" className="custom" />)
    expect(container.firstChild).toHaveClass("custom")
  })
})
