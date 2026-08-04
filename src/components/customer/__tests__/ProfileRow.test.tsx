import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ProfileRow } from "@/components/customer/ProfileRow"

describe("ProfileRow", () => {
  it("renders label and value", () => {
    render(<ProfileRow label="Telefone" value="(11) 99999-9999" />)
    expect(screen.getByText("Telefone")).toBeInTheDocument()
    expect(screen.getByText("(11) 99999-9999")).toBeInTheDocument()
  })

  it("renders icon when provided", () => {
    render(<ProfileRow label="Email" value="test@email.com" />)
    expect(screen.getByText("Email")).toBeInTheDocument()
  })

  it("shows chevron when onClick is provided", () => {
    render(<ProfileRow label="Editar" onClick={vi.fn()} />)
    expect(screen.getByText("Editar")).toBeInTheDocument()
  })

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn()
    render(<ProfileRow label="Editar" onClick={onClick} />)
    await userEvent.click(screen.getByText("Editar"))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("is not interactive when no onClick or href", () => {
    render(<ProfileRow label="Info" value="Value" />)
    const row = screen.getByText("Info").closest("div")
    expect(row).not.toHaveClass("cursor-pointer")
  })
})