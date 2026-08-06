import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import { CountdownLabel } from "@/components/customer/CountdownLabel"

const HOUR = 3_600_000

describe("CountdownLabel", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-05T12:00:00.000Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function renderAt(ms: number) {
    const target = new Date(Date.now() + ms).toISOString()
    render(<CountdownLabel target={target} />)
  }

  it("renders remaining time with seconds under one hour", () => {
    renderAt(5_000)
    expect(screen.getByText("0h 0m 5s")).toBeInTheDocument()
  })

  it("omits seconds over one hour", () => {
    renderAt(2 * HOUR + 60_000)
    expect(screen.getByText("2h 1m")).toBeInTheDocument()
  })

  it("ticks down every second under one hour", () => {
    renderAt(5_000)
    act(() => vi.advanceTimersByTime(1_000))
    expect(screen.getByText("0h 0m 4s")).toBeInTheDocument()
  })

  it("shows Prazo encerrado when target passes", () => {
    renderAt(3_000)
    act(() => vi.advanceTimersByTime(4_000))
    expect(screen.getByText("Prazo encerrado")).toBeInTheDocument()
  })

  it("renders nothing when there is no target", () => {
    const { container } = render(<CountdownLabel target={null} />)
    expect(container.textContent).toBe("")
  })
})
