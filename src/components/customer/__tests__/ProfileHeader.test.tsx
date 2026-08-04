import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { ProfileHeader } from "@/components/customer/ProfileHeader"

describe("ProfileHeader", () => {
  it("renders name, email, and phone", () => {
    render(<ProfileHeader name="Ana Silva" email="ana@email.com" phone="(11) 99999-9999" />)
    expect(screen.getByText("Ana Silva")).toBeInTheDocument()
    expect(screen.getByText("ana@email.com")).toBeInTheDocument()
    expect(screen.getByText("(11) 99999-9999")).toBeInTheDocument()
  })

  it("renders initial letter in avatar", () => {
    render(<ProfileHeader name="Ana Silva" email="ana@email.com" />)
    expect(screen.getByText("A")).toBeInTheDocument()
  })

  it("omits phone when not provided", () => {
    render(<ProfileHeader name="Ana Silva" email="ana@email.com" />)
    expect(screen.queryByText("(11) 99999-9999")).not.toBeInTheDocument()
  })

  it("truncates long names", () => {
    const longName = "A".repeat(100)
    render(<ProfileHeader name={longName} email="ana@email.com" />)
    expect(screen.getByText(longName)).toHaveClass("truncate")
  })
})