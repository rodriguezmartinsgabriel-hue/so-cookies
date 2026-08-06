import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, fireEvent, act } from "@testing-library/react"
import { Modal } from "@/components/ui/Modal"

afterEach(() => {
  document.body.style.overflow = ""
})

describe("Modal", () => {
  it("does not render when open=false", () => {
    const { container } = render(
      <Modal open={false} onClose={vi.fn()}>
        Hidden
      </Modal>,
    )
    expect(container.firstChild).toBeNull()
    expect(screen.queryByText("Hidden")).toBeNull()
  })

  it("renders children when open=true", () => {
    render(
      <Modal open={true} onClose={vi.fn()}>
        Content here
      </Modal>,
    )
    expect(screen.getByText("Content here")).toBeInTheDocument()
  })

  it("has role=dialog and aria-modal=true (a11y)", () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="My Modal">
        Content
      </Modal>,
    )
    const dialog = screen.getByRole("dialog")
    expect(dialog).toHaveAttribute("aria-modal", "true")
  })

  it("exposes the title as aria-label", () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="My Modal">
        Content
      </Modal>,
    )
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-label", "My Modal")
  })

  it("renders the title as h3 when provided", () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="My Modal">
        Content
      </Modal>,
    )
    const heading = screen.getByRole("heading", { level: 3, name: "My Modal" })
    expect(heading).toBeInTheDocument()
  })

  it("renders close button with data-close-modal and aria-label (used by useFocusTrap Escape handler)", () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Test">
        X
      </Modal>,
    )
    const closeBtn = screen.getByRole("button", { name: "Fechar" })
    expect(closeBtn).toBeInTheDocument()
    expect(closeBtn.hasAttribute("data-close-modal")).toBe(true)
  })

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn()
    render(
      <Modal open={true} onClose={onClose} title="T">
        X
      </Modal>,
    )
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("calls onClose when Escape key is pressed", () => {
    const onClose = vi.fn()
    render(
      <Modal open={true} onClose={onClose}>
        X
      </Modal>,
    )
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("calls onClose when clicking the backdrop (outside the panel)", () => {
    const onClose = vi.fn()
    render(
      <Modal open={true} onClose={onClose}>
        X
      </Modal>,
    )
    fireEvent.click(screen.getByRole("dialog"))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("does NOT call onClose when clicking inside the panel (stopPropagation)", () => {
    const onClose = vi.fn()
    render(
      <Modal open={true} onClose={onClose}>
        <div data-testid="inner">X</div>
      </Modal>,
    )
    fireEvent.click(screen.getByTestId("inner"))
    // The inner click bubbles but the panel stops propagation at the GlassSurface level
    // so onClose is not invoked via the dialog backdrop click
    expect(onClose).not.toHaveBeenCalled()
  })

  it("locks body scroll while open and restores on close", () => {
    const { rerender } = render(
      <Modal open={true} onClose={vi.fn()}>
        X
      </Modal>,
    )
    expect(document.body.style.overflow).toBe("hidden")
    rerender(
      <Modal open={false} onClose={vi.fn()}>
        X
      </Modal>,
    )
    expect(document.body.style.overflow).toBe("")
  })

  it("renders footer when provided", () => {
    render(
      <Modal open={true} onClose={vi.fn()} footer={<button data-testid="ok">OK</button>}>
        Body
      </Modal>,
    )
    expect(screen.getByTestId("ok")).toBeInTheDocument()
  })

  it("applies the size class (sm/md/lg)", () => {
    const { rerender } = render(
      <Modal open={true} onClose={vi.fn()} size="sm">
        X
      </Modal>,
    )
    expect(screen.getByRole("dialog").querySelector(".max-w-sm")).not.toBeNull()
    rerender(
      <Modal open={true} onClose={vi.fn()} size="lg">
        X
      </Modal>,
    )
    expect(screen.getByRole("dialog").querySelector(".max-w-2xl")).not.toBeNull()
  })

  it("removes Escape listener when modal closes (does not call onClose after close)", () => {
    const onClose = vi.fn()
    const { rerender } = render(
      <Modal open={true} onClose={onClose}>
        X
      </Modal>,
    )
    rerender(
      <Modal open={false} onClose={onClose}>
        X
      </Modal>,
    )
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    expect(onClose).not.toHaveBeenCalled()
  })
})
