import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ProfileHero } from "@/components/customer/ProfileHero"

describe("ProfileHero", () => {
  const basePoints = { balance: 100, lifetimeEarned: 200, lifetimeSpent: 50, pointsPerReal: 1 }

  it("renderiza nome, email e badge Membro Só", () => {
    render(
      <ProfileHero
        name="Ana Silva"
        email="ana@email.com"
        phone="(11) 99999-9999"
        points={basePoints}
      />,
    )
    expect(screen.getByRole("heading", { level: 2, name: "Ana Silva" })).toBeInTheDocument()
    expect(screen.getByText("ana@email.com")).toBeInTheDocument()
    expect(screen.getByText("(11) 99999-9999")).toBeInTheDocument()
    expect(screen.getByText("Membro Só")).toBeInTheDocument()
  })

  it("omite telefone quando não fornecido", () => {
    render(<ProfileHero name="Ana" email="ana@email.com" points={basePoints} />)
    expect(screen.queryByText("(11) 99999-9999")).toBeNull()
  })

  it("mostra 'Bem-vindo' como fallback quando nome é vazio", () => {
    render(<ProfileHero name="" email="ana@email.com" points={basePoints} />)
    expect(screen.getByText("Bem-vindo")).toBeInTheDocument()
  })

  it("usa primeira letra do email como inicial quando nome vazio", () => {
    render(<ProfileHero name="" email="ana@email.com" points={basePoints} />)
    expect(screen.getByText("A")).toBeInTheDocument()
  })

  it("passa pontos para ProfilePointsCard (saldo e totais)", () => {
    render(<ProfileHero name="Ana" email="ana@email.com" points={basePoints} />)
    expect(screen.getByText("100")).toBeInTheDocument()
    expect(screen.getByText("200")).toBeInTheDocument()
    expect(screen.getByText("50")).toBeInTheDocument()
  })

  it("propaga onViewPointsHistory para o botão do PointsCard", async () => {
    const onView = vi.fn()
    render(
      <ProfileHero
        name="Ana"
        email="ana@email.com"
        points={{ ...basePoints, balance: 10 }}
        onViewPointsHistory={onView}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: /Ver histórico/i }))
    expect(onView).toHaveBeenCalledTimes(1)
  })
})
