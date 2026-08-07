import { describe, it, expect, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ProfileSignOut } from "@/components/customer/ProfileSignOut"

describe("ProfileSignOut", () => {
  it("renderiza botão 'Sair da conta'", () => {
    render(<ProfileSignOut onSignOut={vi.fn()} />)
    expect(screen.getByRole("button", { name: /Sair da conta/i })).toBeInTheDocument()
  })

  it("abre confirmação ao clicar", async () => {
    render(<ProfileSignOut onSignOut={vi.fn()} />)
    await userEvent.click(screen.getByRole("button", { name: /Sair da conta/i }))
    expect(await screen.findByText(/Tem certeza que deseja sair/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Sair" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Voltar" })).toBeInTheDocument()
  })

  it("volta para o estado inicial ao clicar em 'Voltar'", async () => {
    render(<ProfileSignOut onSignOut={vi.fn()} />)
    await userEvent.click(screen.getByRole("button", { name: /Sair da conta/i }))
    await screen.findByText(/Tem certeza/)
    await userEvent.click(screen.getByRole("button", { name: "Voltar" }))
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Sair da conta/i })).toBeInTheDocument()
    })
    expect(screen.queryByText(/Tem certeza/)).toBeNull()
  })

  it("chama onSignOut ao confirmar", async () => {
    const onSignOut = vi.fn()
    render(<ProfileSignOut onSignOut={onSignOut} />)
    await userEvent.click(screen.getByRole("button", { name: /Sair da conta/i }))
    await screen.findByText(/Tem certeza/)
    await userEvent.click(screen.getByRole("button", { name: "Sair" }))
    expect(onSignOut).toHaveBeenCalledTimes(1)
  })

  it("desabilita botões quando loading=true", async () => {
    render(<ProfileSignOut onSignOut={vi.fn()} loading />)
    expect(screen.getByRole("button", { name: /Sair da conta/i })).not.toBeDisabled()
    await userEvent.click(screen.getByRole("button", { name: /Sair da conta/i }))
    await screen.findByText(/Tem certeza/)
    expect(screen.getByRole("button", { name: "Voltar" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Sair" })).toBeDisabled()
  })
})
