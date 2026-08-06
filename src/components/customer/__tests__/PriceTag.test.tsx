import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { PriceTag } from "@/components/customer/PriceTag"
import type { AvailablePriceTier } from "@/hooks/usePricing"

const TIERS: AvailablePriceTier[] = [
  { id: "t1", productId: "p1", name: "Leve 3", minQty: 3, maxQty: 9, price: 5.5 },
  { id: "t2", productId: "p1", name: "Leve 10", minQty: 10, maxQty: null, price: 4.5 },
]

describe("PriceTag", () => {
  it("renders a single price line when there is no discount", () => {
    render(<PriceTag basePrice={6.5} qty={1} unit="un" />)
    expect(screen.getByText("R$ 6,50 / un")).toBeInTheDocument()
    expect(screen.queryByText(/line-through/i)).not.toBeInTheDocument()
  })

  it("renders the resolved unit price when provided (from pricing engine)", () => {
    render(<PriceTag basePrice={10} qty={3} unit="un" resolvedUnitPrice={8.5} />)
    expect(screen.getByText("R$ 8,50 / un")).toBeInTheDocument()
    expect(screen.getByText("R$ 10,00")).toBeInTheDocument()
    expect(screen.getByText("−15%")).toBeInTheDocument()
  })

  it("computes the tier locally from `tiers` when `resolvedUnitPrice` is absent", () => {
    render(<PriceTag basePrice={6.5} qty={3} unit="un" tiers={TIERS} />)
    expect(screen.getByText("R$ 5,50 / un")).toBeInTheDocument()
    expect(screen.getByText("R$ 6,50")).toBeInTheDocument()
  })

  it("shows the highest tier price when quantity >= 10", () => {
    render(<PriceTag basePrice={6.5} qty={10} unit="un" tiers={TIERS} />)
    expect(screen.getByText("R$ 4,50 / un")).toBeInTheDocument()
  })

  it("ignores tiers with qty <= 0 and shows the full price", () => {
    render(<PriceTag basePrice={6.5} qty={0} unit="un" tiers={TIERS} />)
    expect(screen.getByText("R$ 6,50 / un")).toBeInTheDocument()
    expect(screen.queryByText("R$ 5,50 / un")).not.toBeInTheDocument()
  })

  it("renders nothing discount-related when tiers array is empty", () => {
    render(<PriceTag basePrice={6.5} qty={3} unit="un" tiers={[]} />)
    expect(screen.getByText("R$ 6,50 / un")).toBeInTheDocument()
  })
})
