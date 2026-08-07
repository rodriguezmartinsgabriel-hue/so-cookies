import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ProfileInfoCard } from "@/components/customer/ProfileInfoCard"
import { User } from "lucide-react"

describe("ProfileInfoCard", () => {
  it("renderiza ícone, eyebrow e título", () => {
    render(
      <ProfileInfoCard icon={<User data-testid="icon" />} eyebrow="Identidade" title="Dados pessoais">
        <div>conteúdo</div>
      </ProfileInfoCard>,
    )
    expect(screen.getByTestId("icon")).toBeInTheDocument()
    expect(screen.getByText("Identidade")).toBeInTheDocument()
    expect(screen.getByText("Dados pessoais")).toBeInTheDocument()
  })

  it("renderiza children", () => {
    render(
      <ProfileInfoCard icon={<User />} title="Seção">
        <p>Filho 1</p>
        <p>Filho 2</p>
      </ProfileInfoCard>,
    )
    expect(screen.getByText("Filho 1")).toBeInTheDocument()
    expect(screen.getByText("Filho 2")).toBeInTheDocument()
  })

  it("chama onAction ao clicar no botão", async () => {
    const onClick = vi.fn()
    render(
      <ProfileInfoCard
        icon={<User />}
        title="Seção"
        action={{ label: "Editar", onClick }}
      >
        <div>x</div>
      </ProfileInfoCard>,
    )
    await userEvent.click(screen.getByRole("button", { name: "Editar" }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("não renderiza botão quando action não é passado", () => {
    render(
      <ProfileInfoCard icon={<User />} title="Seção">
        <div>x</div>
      </ProfileInfoCard>,
    )
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("usa ariaLabel customizado quando fornecido", () => {
    render(
      <ProfileInfoCard
        icon={<User />}
        title="Seção"
        action={{ label: "Editar", onClick: vi.fn(), ariaLabel: "Editar dados pessoais" }}
      >
        <div>x</div>
      </ProfileInfoCard>,
    )
    expect(screen.getByRole("button", { name: "Editar dados pessoais" })).toBeInTheDocument()
  })

  it("aplica className customizada no container", () => {
    const { container } = render(
      <ProfileInfoCard icon={<User />} title="X" className="minha-classe">
        <div>x</div>
      </ProfileInfoCard>,
    )
    expect(container.firstChild).toHaveClass("minha-classe")
  })
})
