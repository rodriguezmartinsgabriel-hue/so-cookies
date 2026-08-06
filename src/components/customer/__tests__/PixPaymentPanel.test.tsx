import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ToastProvider } from "@/components/ui/Toast"
import { PixPaymentPanel, type PixPaymentOrder } from "@/components/customer/PixPaymentPanel"

function makeOrder(overrides: Partial<PixPaymentOrder> = {}): PixPaymentOrder {
  return {
    paymentStatus: "AGUARDANDO_PAGAMENTO",
    paymentQrCode: "00020126580014br.gov.bcb.pix0136example-psmpeypix",
    paymentQrCodeBase64:
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    paymentExpiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    ...overrides,
  }
}

function renderPanel(order: PixPaymentOrder, onRetry = vi.fn()) {
  return render(
    <ToastProvider>
      <PixPaymentPanel order={order} onRetry={onRetry} retrying={false} retryError="" />
    </ToastProvider>,
  )
}

describe("PixPaymentPanel", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("renders the QR code, PIX code and copy button while awaiting payment", () => {
    renderPanel(makeOrder())
    expect(screen.getByAltText("QR Code PIX")).toBeInTheDocument()
    expect(screen.getByText("Aguardando pagamento")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /copiar código pix/i })).toBeInTheDocument()
    expect(screen.getByText(/expira em/i)).toBeInTheDocument()
  })

  it("copies the PIX code to the clipboard on click", async () => {
    renderPanel(makeOrder())
    await userEvent.click(screen.getByRole("button", { name: /copiar código pix/i }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(makeOrder().paymentQrCode)
    expect(await screen.findByRole("button", { name: /código copiado/i })).toBeInTheDocument()
  })

  it("shows the expired state with a retry button when the payment is expired", () => {
    renderPanel(makeOrder({ paymentStatus: "EXPIRADO" }))
    expect(screen.getByText("Prazo para pagamento encerrado")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /gerar novo pix/i })).toBeInTheDocument()
  })

  it("switches to the expired state when the countdown runs out", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-05T12:00:00.000Z"))
    renderPanel(makeOrder({ paymentExpiresAt: new Date(Date.now() + 3_000).toISOString() }))
    act(() => vi.advanceTimersByTime(4_000))
    expect(screen.getByText("Prazo para pagamento encerrado")).toBeInTheDocument()
  })

  it("calls onRetry when the retry button is clicked", async () => {
    const onRetry = vi.fn()
    renderPanel(makeOrder({ paymentStatus: "EXPIRADO" }), onRetry)
    await userEvent.click(screen.getByRole("button", { name: /gerar novo pix/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it("shows a confirmation when the payment is paid", () => {
    renderPanel(makeOrder({ paymentStatus: "PAGO", paymentExpiresAt: null }))
    expect(screen.getByText("Pagamento confirmado")).toBeInTheDocument()
  })

  it("shows the retry error message when present", () => {
    render(
      <ToastProvider>
        <PixPaymentPanel
          order={makeOrder({ paymentStatus: "EXPIRADO" })}
          onRetry={vi.fn()}
          retrying={false}
          retryError="Rota lotada, escolha outra data"
        />
      </ToastProvider>,
    )
    expect(screen.getByText("Rota lotada, escolha outra data")).toBeInTheDocument()
  })
})
