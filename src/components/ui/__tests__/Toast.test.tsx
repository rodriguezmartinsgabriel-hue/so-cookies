import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { Component } from "react"
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ToastProvider, useToast } from "@/components/ui/Toast"

function renderWithTrigger() {
  return render(
    <ToastProvider>
      <ToastTrigger />
    </ToastProvider>,
  )
}

function ToastTrigger() {
  const { toast } = useToast()
  return <button onClick={() => toast("success", "Test toast", "message")}>Trigger</button>
}

class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return <div data-testid="error">{this.state.error.message}</div>
    }
    return this.props.children
  }
}

function ToastOrphan() {
  const { toast } = useToast()
  // touch toast to consume unused variable warning
  void toast
  return <div data-testid="ok">ok</div>
}

describe("Toast", () => {
  beforeEach(() => {
    // real timers by default; tests that need fake timers opt-in
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("renders children inside provider", () => {
    render(
      <ToastProvider>
        <div data-testid="child">content</div>
      </ToastProvider>,
    )
    expect(screen.getByTestId("child")).toBeInTheDocument()
  })

  it("useToast throws when used outside ToastProvider", () => {
    render(
      <ErrorBoundary>
        <ToastOrphan />
      </ErrorBoundary>,
    )
    expect(screen.getByTestId("error").textContent).toMatch(/ToastProvider/)
  })

  it("shows a toast with the title and message when toast() is invoked", async () => {
    vi.useRealTimers()
    renderWithTrigger()
    const trigger = screen.getByRole("button", { name: "Trigger" })
    await userEvent.click(trigger)
    expect(screen.getByText("Test toast")).toBeInTheDocument()
    expect(screen.getByText("message")).toBeInTheDocument()
  })

  it("dismisses toast on close button click", async () => {
    vi.useRealTimers()
    renderWithTrigger()
    const trigger = screen.getByRole("button", { name: "Trigger" })
    await userEvent.click(trigger)
    expect(screen.getByText("Test toast")).toBeInTheDocument()
    const closeBtn = screen.getByRole("button", { name: "Fechar" })
    await userEvent.click(closeBtn)
    await waitFor(() => expect(screen.queryByText("Test toast")).toBeNull())
  })

  it("auto-dismisses after 4 seconds", () => {
    vi.useFakeTimers()
    renderWithTrigger()
    const trigger = screen.getByRole("button", { name: "Trigger" })
    act(() => {
      fireEvent.click(trigger)
    })
    expect(screen.getByText("Test toast")).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(4200))
    expect(screen.queryByText("Test toast")).toBeNull()
  })
})
