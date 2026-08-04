import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { ProfileSection } from "@/components/customer/ProfileSection"

describe("ProfileSection", () => {
  it("renders title and children", () => {
    render(
      <ProfileSection title="Dados Pessoais">
        <div>Content</div>
      </ProfileSection>,
    )
    expect(screen.getByText("Dados Pessoais")).toBeInTheDocument()
    expect(screen.getByText("Content")).toBeInTheDocument()
  })

  it("renders icon when provided", () => {
    render(
      <ProfileSection icon={<span data-testid="icon">📋</span>} title="Section">
        <div>Content</div>
      </ProfileSection>,
    )
    expect(screen.getByTestId("icon")).toBeInTheDocument()
  })

  it("applies custom className", () => {
    render(
      <ProfileSection title="Section" className="custom-class">
        <div>Content</div>
      </ProfileSection>,
    )
    expect(screen.getByText("Section")).toBeInTheDocument()
  })
})