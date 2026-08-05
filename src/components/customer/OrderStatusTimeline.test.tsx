import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { OrderStatusTimeline } from "./OrderStatusTimeline"

describe("OrderStatusTimeline", () => {
  it("renderiza todos os status", () => {
    render(<OrderStatusTimeline status="PENDENTE" />)
    expect(screen.getByText("Recebido")).toBeInTheDocument()
    expect(screen.getByText("Confirmado")).toBeInTheDocument()
    expect(screen.getByText("Em produção")).toBeInTheDocument()
    expect(screen.getByText("Pronto para retirar")).toBeInTheDocument()
    expect(screen.getByText("Em entrega")).toBeInTheDocument()
    expect(screen.getByText("Finalizado")).toBeInTheDocument()
  })

  it("highlight o status atual", () => {
    render(<OrderStatusTimeline status="PRODUCAO" />)
    expect(screen.getByText("Em produção")).toHaveClass("font-semibold")
  })

  it("não renderiza para status desconhecido", () => {
    const { container } = render(<OrderStatusTimeline status="INVALIDO" />)
    expect(container.firstChild).toBeNull()
  })
})