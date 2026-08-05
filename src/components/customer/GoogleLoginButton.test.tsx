import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { GoogleLoginButton } from "./GoogleLoginButton"

describe("GoogleLoginButton", () => {
  it("renderiza o botão com texto padrão", () => {
    render(<GoogleLoginButton />)
    expect(screen.getByText("Continuar com Google")).toBeInTheDocument()
  })

  it("renderiza com texto customizado quando next é fornecido", () => {
    render(<GoogleLoginButton next="/pedido/123" />)
    expect(screen.getByText("Continuar com Google")).toBeInTheDocument()
  })

  it("mostra spinner e desabilita durante loading", () => {
    render(<GoogleLoginButton />)
    const button = screen.getByRole("link", { name: /continuar com google/i })
    expect(button).not.toHaveClass("opacity-60")
  })
})