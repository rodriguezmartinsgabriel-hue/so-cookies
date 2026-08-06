import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ProductCard } from "@/components/customer/ProductCard"
import type { CatalogProduct } from "@/lib/utils"

function makeProduct(overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    id: "cookie-1",
    name: "Cookie de Chocolate",
    category: "Cookies",
    price: 6.5,
    unit: "un",
    image: null,
    description: "Cookie crocante com gotas de chocolate.",
    nutrition: null,
    ...overrides,
  }
}

function setup(overrides: {
  qty?: number
  isExpanded?: boolean
  onExpand?: () => void
  onCollapse?: () => void
  onAdd?: () => void
  onSetQty?: (qty: number) => void
} = {}) {
  const props = {
    product: makeProduct(),
    qty: 0,
    isExpanded: false,
    onExpand: vi.fn(),
    onCollapse: vi.fn(),
    onAdd: vi.fn(),
    onSetQty: vi.fn(),
    ...overrides,
  }
  render(<ProductCard {...props} />)
  return props
}

describe("ProductCard", () => {
  it("renders the product name and price", () => {
    setup()
    expect(screen.getByText("Cookie de Chocolate")).toBeInTheDocument()
    expect(screen.getByText("R$ 6,50 / un")).toBeInTheDocument()
  })

  it("shows a single add button when qty is 0", () => {
    setup({ qty: 0 })
    expect(screen.getByRole("button", { name: /adicionar cookie de chocolate/i })).toBeInTheDocument()
  })

  it("shows decrease/increase buttons when qty is greater than 0", () => {
    setup({ qty: 3 })
    expect(screen.getByRole("button", { name: /diminuir cookie de chocolate/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /aumentar cookie de chocolate/i })).toBeInTheDocument()
    expect(screen.getByLabelText("Quantidade 3")).toBeInTheDocument()
  })

  it("calls onAdd when the add button is clicked", async () => {
    const user = userEvent.setup()
    const props = setup({ qty: 0 })
    await user.click(screen.getByRole("button", { name: /adicionar cookie de chocolate/i }))
    expect(props.onAdd).toHaveBeenCalledTimes(1)
    expect(props.onExpand).not.toHaveBeenCalled()
  })

  it("calls onSetQty when increase/decrease is clicked", async () => {
    const user = userEvent.setup()
    const props = setup({ qty: 2 })
    await user.click(screen.getByRole("button", { name: /aumentar cookie de chocolate/i }))
    expect(props.onSetQty).toHaveBeenCalledWith(3)
    await user.click(screen.getByRole("button", { name: /diminuir cookie de chocolate/i }))
    expect(props.onSetQty).toHaveBeenCalledWith(1)
  })

  it("calls onSetQty when the expanded panel stepper is clicked", async () => {
    const user = userEvent.setup()
    const props = setup({ qty: 2, isExpanded: true })
    await user.click(screen.getByRole("button", { name: /aumentar quantidade/i }))
    expect(props.onSetQty).toHaveBeenCalledWith(3)
    await user.click(screen.getByRole("button", { name: /diminuir quantidade/i }))
    expect(props.onSetQty).toHaveBeenCalledWith(1)
    expect(props.onCollapse).not.toHaveBeenCalled()
  })

  it("keeps the expanded panel stepper clickable (no blocking styles)", () => {
    setup({ qty: 1, isExpanded: true })
    const plus = screen.getByRole("button", { name: /aumentar quantidade/i })
    const minus = screen.getByRole("button", { name: /diminuir quantidade/i })
    expect(plus).toBeEnabled()
    expect(minus).toBeEnabled()
    expect(plus).not.toHaveStyle({ pointerEvents: "none" })
    expect(minus).not.toHaveStyle({ pointerEvents: "none" })
  })

  it("hides the header quantity controls when expanded to avoid duplicates", () => {
    setup({ qty: 3, isExpanded: true })
    expect(screen.queryByRole("button", { name: /aumentar cookie de chocolate/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /diminuir cookie de chocolate/i })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /aumentar quantidade/i })).toBeInTheDocument()
  })

  it("hides the header add button when expanded", () => {
    setup({ qty: 0, isExpanded: true })
    expect(screen.queryByRole("button", { name: /adicionar cookie de chocolate ao carrinho/i })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /aumentar quantidade/i })).toBeInTheDocument()
  })

  it("calls onExpand when the header is clicked while collapsed", async () => {
    const user = userEvent.setup()
    const props = setup({ isExpanded: false })
    await user.click(screen.getByRole("button", { name: /ver detalhes de cookie de chocolate/i }))
    expect(props.onExpand).toHaveBeenCalledTimes(1)
    expect(props.onCollapse).not.toHaveBeenCalled()
  })

  it("calls onCollapse when the header is clicked while expanded", async () => {
    const user = userEvent.setup()
    const props = setup({ isExpanded: true })
    await user.click(screen.getByRole("button", { name: /recolher cookie de chocolate/i, expanded: true }))
    expect(props.onCollapse).toHaveBeenCalledTimes(1)
    expect(props.onExpand).not.toHaveBeenCalled()
  })

  it("expands on Enter key", async () => {
    const user = userEvent.setup()
    const props = setup({ isExpanded: false })
    const header = screen.getByRole("button", { name: /ver detalhes de cookie de chocolate/i })
    header.focus()
    await user.keyboard("{Enter}")
    expect(props.onExpand).toHaveBeenCalledTimes(1)
  })

  it("sets aria-expanded to match the isExpanded prop", () => {
    setup({ isExpanded: false })
    expect(screen.getByRole("button", { name: /ver detalhes de cookie de chocolate/i })).toHaveAttribute("aria-expanded", "false")
  })
})
