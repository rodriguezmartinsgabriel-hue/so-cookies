import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ProfilePointsCard } from "@/components/customer/ProfilePointsCard"

describe("ProfilePointsCard", () => {
  it("renderiza saldo e totais quando há pontos", () => {
    render(
      <ProfilePointsCard balance={120} lifetimeEarned={300} lifetimeSpent={50} pointsPerReal={1} />,
    )
    expect(screen.getByText("120")).toBeInTheDocument()
    expect(screen.getByText("300")).toBeInTheDocument()
    expect(screen.getByText("50")).toBeInTheDocument()
    expect(screen.getByText("pts disponíveis")).toBeInTheDocument()
  })

  it("mostra estado vazio quando balance=0 e lifetimeEarned=0", () => {
    render(
      <ProfilePointsCard balance={0} lifetimeEarned={0} lifetimeSpent={0} pointsPerReal={1} />,
    )
    expect(screen.getByText(/Comece a acumular pontos/)).toBeInTheDocument()
    expect(screen.getByText(/por cada R\$ 1,00 gasto/)).toBeInTheDocument()
    expect(screen.queryByText("pts disponíveis")).toBeNull()
  })

  it("pluraliza 'ponto' quando pointsPerReal !== 1", () => {
    render(
      <ProfilePointsCard balance={0} lifetimeEarned={0} lifetimeSpent={0} pointsPerReal={2} />,
    )
    const matches = screen.getAllByText((_, node) => {
      if (!node) return false
      const text = node.textContent ?? ""
      return text.includes("2 pontos") && text.includes("R$ 1,00")
    })
    expect(matches.length).toBeGreaterThan(0)
  })

  it("usa singular 'ponto' quando pointsPerReal = 1", () => {
    render(
      <ProfilePointsCard balance={0} lifetimeEarned={0} lifetimeSpent={0} pointsPerReal={1} />,
    )
    const matches = screen.getAllByText((_, node) => {
      if (!node) return false
      const text = node.textContent ?? ""
      return text.includes("1 ponto por cada") && text.includes("R$ 1,00")
    })
    expect(matches.length).toBeGreaterThan(0)
  })

  it("chama onViewHistory ao clicar em 'Ver histórico'", async () => {
    const onViewHistory = vi.fn()
    render(
      <ProfilePointsCard
        balance={10}
        lifetimeEarned={10}
        lifetimeSpent={0}
        pointsPerReal={1}
        onViewHistory={onViewHistory}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: /Ver histórico completo/i }))
    expect(onViewHistory).toHaveBeenCalledTimes(1)
  })

  it("não mostra botão 'Ver histórico' quando saldo=0 e ganho=0", () => {
    render(
      <ProfilePointsCard balance={0} lifetimeEarned={0} lifetimeSpent={0} pointsPerReal={1} onViewHistory={vi.fn()} />,
    )
    expect(screen.queryByRole("button", { name: /Ver histórico/i })).toBeNull()
  })

  it("não mostra botão quando onViewHistory não é passado", () => {
    render(<ProfilePointsCard balance={10} lifetimeEarned={10} lifetimeSpent={0} pointsPerReal={1} />)
    expect(screen.queryByRole("button", { name: /Ver histórico/i })).toBeNull()
  })
})
