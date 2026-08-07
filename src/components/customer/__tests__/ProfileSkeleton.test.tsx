import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { ProfileSkeleton } from "@/components/customer/ProfileSkeleton"

describe("ProfileSkeleton", () => {
  it("renderiza com role=status e aria-label", () => {
    render(<ProfileSkeleton />)
    expect(screen.getByRole("status", { name: /Carregando perfil/i })).toBeInTheDocument()
  })

  it("renderiza múltiplos blocos (hero + 3 cards)", () => {
    const { container } = render(<ProfileSkeleton />)
    const skelBlocks = container.querySelectorAll(".animate-shimmer-sweep")
    expect(skelBlocks.length).toBeGreaterThan(5)
  })
})
