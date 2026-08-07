import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { MenuSkeleton } from "@/components/customer/MenuSkeleton"

describe("MenuSkeleton", () => {
  it("declara status de carregamento para leitores de tela", () => {
    render(<MenuSkeleton />)
    expect(screen.getByRole("status", { name: "Carregando cardápio" })).toBeInTheDocument()
  })

  it("espelha o hero do cardápio (superfície glass forte)", () => {
    const { container } = render(<MenuSkeleton />)
    const hero = container.querySelector(".glass-surface.rounded-2xl")
    expect(hero).not.toBeNull()
  })

  it("renderiza cards placeholder em superfícies rounded-2xl", () => {
    const { container } = render(<MenuSkeleton />)
    expect(container.querySelectorAll(".glass-surface.rounded-2xl").length).toBeGreaterThanOrEqual(5)
  })
})
