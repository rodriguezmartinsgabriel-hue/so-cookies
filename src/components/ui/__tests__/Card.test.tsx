import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Card } from "@/components/ui/Card"
import { GlassSurface } from "@/components/ui/GlassSurface"

describe("Card", () => {
  it("renders children inside the card", () => {
    render(<Card>Hello</Card>)
    expect(screen.getByText("Hello")).toBeInTheDocument()
  })

  it("applies rounded-xl by default", () => {
    const { container } = render(<Card>X</Card>)
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain("rounded-xl")
  })

  it("applies padding by default (p-4)", () => {
    const { container } = render(<Card>X</Card>)
    expect((container.firstChild as HTMLElement).className).toContain("p-4")
  })

  it("removes padding when padded=false", () => {
    const { container } = render(<Card padded={false}>X</Card>)
    expect((container.firstChild as HTMLElement).className).not.toContain("p-4")
  })

  it("adds hover transition when interactive=true", () => {
    const { container } = render(<Card interactive>X</Card>)
    expect((container.firstChild as HTMLElement).className).toContain("hover:shadow-lg")
  })

  it("merges custom className", () => {
    const { container } = render(<Card className="my-card">X</Card>)
    expect((container.firstChild as HTMLElement).className).toContain("my-card")
  })

  it("forwards extra HTML attributes (data-testid, onClick)", () => {
    render(<Card data-testid="my-card">X</Card>)
    expect(screen.getByTestId("my-card")).toBeInTheDocument()
  })
})

describe("GlassSurface", () => {
  it("renders a div by default", () => {
    const { container } = render(<GlassSurface>Glass</GlassSurface>)
    expect(container.firstChild?.nodeName).toBe("DIV")
  })

  it("renders as a different tag when `as` is provided", () => {
    const { container } = render(<GlassSurface as="section">Glass</GlassSurface>)
    expect(container.firstChild?.nodeName).toBe("SECTION")
  })

  it("always includes the .glass-surface class", () => {
    const { container } = render(<GlassSurface>Glass</GlassSurface>)
    expect((container.firstChild as HTMLElement).className).toContain("glass-surface")
  })

  it("applies inline style for backdrop-filter in glass variant (non-apple)", () => {
    const { container } = render(<GlassSurface variant="glass">X</GlassSurface>)
    const el = container.firstChild as HTMLElement
    expect(el.style.backgroundColor).toContain("var(--glass")
  })

  it("applies solid background when variant=solid", () => {
    const { container } = render(<GlassSurface variant="solid">X</GlassSurface>)
    const el = container.firstChild as HTMLElement
    expect(el.style.backgroundColor).toBe("var(--paper)")
  })

  it("strong tone applies --glass-tint-strong", () => {
    const { container } = render(<GlassSurface tone="strong">X</GlassSurface>)
    const el = container.firstChild as HTMLElement
    expect(el.style.backgroundColor).toContain("strong")
  })

  it("merges custom className", () => {
    const { container } = render(<GlassSurface className="my-glass">X</GlassSurface>)
    expect((container.firstChild as HTMLElement).className).toContain("my-glass")
  })

  it("renders children", () => {
    render(
      <GlassSurface>
        <span data-testid="child">child</span>
      </GlassSurface>,
    )
    expect(screen.getByTestId("child")).toBeInTheDocument()
  })
})
