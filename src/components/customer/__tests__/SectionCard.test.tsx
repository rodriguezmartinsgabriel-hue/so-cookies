import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SectionCard } from "@/components/customer/SectionCard"
import { User } from "lucide-react"

describe("SectionCard", () => {
  it("renderiza ícone (opcional), eyebrow e título", () => {
    render(
      <SectionCard icon={<User data-testid="icon" />} eyebrow="Entrega" title="Como você quer receber?">
        <div>conteúdo</div>
      </SectionCard>,
    )
    expect(screen.getByTestId("icon")).toBeInTheDocument()
    expect(screen.getByText("Entrega")).toBeInTheDocument()
    expect(screen.getByText("Como você quer receber?")).toBeInTheDocument()
  })

  it("não renderiza a área de ícone quando icon não é passado", () => {
    render(
      <SectionCard title="Cupom de desconto">
        <div>x</div>
      </SectionCard>,
    )
    expect(screen.queryByTestId("icon")).toBeNull()
  })

  it("renderiza children", () => {
    render(
      <SectionCard title="Seção">
        <p>Filho 1</p>
        <p>Filho 2</p>
      </SectionCard>,
    )
    expect(screen.getByText("Filho 1")).toBeInTheDocument()
    expect(screen.getByText("Filho 2")).toBeInTheDocument()
  })

  it("chama onAction ao clicar no botão", async () => {
    const onClick = vi.fn()
    render(
      <SectionCard title="Seção" action={{ label: "Editar", onClick }}>
        <div>x</div>
      </SectionCard>,
    )
    await userEvent.click(screen.getByRole("button", { name: "Editar" }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("não renderiza botão quando action não é passado", () => {
    render(
      <SectionCard title="Seção">
        <div>x</div>
      </SectionCard>,
    )
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("usa ariaLabel customizado quando fornecido", () => {
    render(
      <SectionCard title="Seção" action={{ label: "Editar", onClick: vi.fn(), ariaLabel: "Editar seção" }}>
        <div>x</div>
      </SectionCard>,
    )
    expect(screen.getByRole("button", { name: "Editar seção" })).toBeInTheDocument()
  })

  it("aplica className customizada no container", () => {
    const { container } = render(
      <SectionCard title="X" className="minha-classe">
        <div>x</div>
      </SectionCard>,
    )
    expect(container.firstChild).toHaveClass("minha-classe")
  })
})
