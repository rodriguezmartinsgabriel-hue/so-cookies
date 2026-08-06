import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { VolumeDiscountHint } from "@/components/customer/VolumeDiscountHint"
import type { AvailablePriceTier } from "@/hooks/usePricing"

const TIERS: AvailablePriceTier[] = [
  { id: "t1", productId: "p1", name: "Leve 3", minQty: 3, maxQty: 9, price: 5.5 },
  { id: "t2", productId: "p1", name: "Leve 10", minQty: 10, maxQty: null, price: 4.5 },
]

describe("VolumeDiscountHint", () => {
  it("renders nothing when there are no tiers", () => {
    const { container } = render(<VolumeDiscountHint tiers={[]} qty={2} basePrice={6.5} />)
    expect(container.firstChild).toBeNull()
  })

  it("renders nothing when qty is 0", () => {
    const { container } = render(<VolumeDiscountHint tiers={TIERS} qty={0} basePrice={6.5} />)
    expect(container.firstChild).toBeNull()
  })

  it("shows the active tier when qty crosses a threshold", () => {
    render(<VolumeDiscountHint tiers={TIERS} qty={3} basePrice={6.5} />)
    expect(screen.getByText(/Leve 3/i)).toBeInTheDocument()
    expect(screen.getByText(/R\$ 5,50/i)).toBeInTheDocument()
  })

  it("shows progress to the next tier when below it", () => {
    render(<VolumeDiscountHint tiers={TIERS} qty={7} basePrice={6.5} />)
    expect(screen.getByText(/Leve 3/i)).toBeInTheDocument()
    expect(screen.getByText(/Faltam/i)).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument() // 10 - 7
  })

  it("hides progress when at the top tier", () => {
    render(<VolumeDiscountHint tiers={TIERS} qty={15} basePrice={6.5} />)
    expect(screen.getByText(/Leve 10/i)).toBeInTheDocument()
    expect(screen.queryByText(/Faltam/i)).not.toBeInTheDocument()
  })
})
