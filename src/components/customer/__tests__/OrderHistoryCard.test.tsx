import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { OrderHistoryCard } from "@/components/customer/OrderHistoryCard"
import type { PublicOrder } from "@/lib/customer-types"

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
}))

function makeOrder(id: string, overrides: Partial<PublicOrder> = {}): PublicOrder {
  return {
    id,
    status: "CONCLUIDO",
    total: 30,
    pickupCode: null,
    notes: null,
    createdAt: "2026-07-01T12:00:00Z",
    deliveryDate: null,
    deliveryRouteId: null,
    deliveryAddress: null,
    deliveryCep: null,
    deliveryStreet: null,
    deliveryNumber: null,
    deliveryComplement: null,
    deliveryNeighborhood: null,
    deliveryCity: null,
    deliveryState: null,
    items: [
      { id: "item-1", qty: 2, price: 15, product: { id: "p1", name: "Cookie" }, name: "Cookie" },
    ],
    ...overrides,
  }
}

describe("OrderHistoryCard", () => {
  beforeEach(() => {
    mockPush.mockClear()
  })

  it("fecha por padrão e mostra a contagem de pedidos", () => {
    render(<OrderHistoryCard orders={[makeOrder("order-1"), makeOrder("order-2")]} />)
    expect(screen.getByText("Meus pedidos")).toBeInTheDocument()
    expect(screen.getByText("2 pedidos")).toBeInTheDocument()
    expect(screen.queryAllByRole("listitem")).toHaveLength(0)
  })

  it("mostra contagem no singular quando há um pedido", () => {
    render(<OrderHistoryCard orders={[makeOrder("order-1")]} />)
    expect(screen.getByText("1 pedido")).toBeInTheDocument()
  })

  it("abre a lista ao clicar no cabeçalho", async () => {
    const user = userEvent.setup()
    render(<OrderHistoryCard orders={[makeOrder("order-1"), makeOrder("order-2")]} />)
    const header = screen.getByRole("button", { name: /ver histórico de pedidos/i })
    await user.click(header)
    expect(header).toHaveAttribute("aria-expanded", "true")
    expect(screen.getAllByRole("listitem")).toHaveLength(2)
  })

  it("recolhe a lista ao clicar de novo", async () => {
    const user = userEvent.setup()
    render(<OrderHistoryCard orders={[makeOrder("order-1")]} />)
    const header = screen.getByRole("button", { name: /ver histórico de pedidos/i })
    await user.click(header)
    expect(screen.getAllByRole("listitem")).toHaveLength(1)
    await user.click(header)
    expect(header).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryAllByRole("listitem")).toHaveLength(0)
  })

  it("abre com Enter no cabeçalho", async () => {
    const user = userEvent.setup()
    render(<OrderHistoryCard orders={[makeOrder("order-1")]} />)
    const header = screen.getByRole("button", { name: /ver histórico de pedidos/i })
    header.focus()
    await user.keyboard("{Enter}")
    expect(header).toHaveAttribute("aria-expanded", "true")
    expect(screen.getAllByRole("listitem")).toHaveLength(1)
  })

  it("mostra no máximo os 5 pedidos mais recentes", async () => {
    const user = userEvent.setup()
    const orders = Array.from({ length: 7 }, (_, i) => makeOrder(`order-${i + 1}`))
    render(<OrderHistoryCard orders={orders} />)
    await user.click(screen.getByRole("button", { name: /ver histórico de pedidos/i }))
    expect(screen.getAllByRole("listitem")).toHaveLength(5)
  })

  it("navega para o pedido ao clicar numa linha", async () => {
    const user = userEvent.setup()
    render(<OrderHistoryCard orders={[makeOrder("order-1")]} />)
    await user.click(screen.getByRole("button", { name: /ver histórico de pedidos/i }))
    const row = screen.getAllByRole("listitem")[0]
    await user.click(within(row).getByRole("button"))
    expect(mockPush).toHaveBeenCalledWith("/pedido/order-1")
  })

  it("mostra o estado vazio quando não há pedidos", () => {
    render(<OrderHistoryCard orders={[]} />)
    expect(screen.getByText("Nenhum pedido ainda")).toBeInTheDocument()
    expect(screen.getByText("0 pedidos")).toBeInTheDocument()
  })
})
