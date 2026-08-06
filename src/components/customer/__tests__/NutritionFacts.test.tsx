import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { NutritionFacts } from "@/components/customer/NutritionFacts"
import type { ProductNutrition } from "@/lib/recipe-nutrition"

const base: ProductNutrition = {
  caloriesPerUnit: 245,
  proteinPerUnit: 12.34,
  carbsPerUnit: 30.56,
  fatPerUnit: 8.1,
  ingredients: [],
  tags: [],
  allergens: [],
}

describe("NutritionFacts", () => {
  it("shows a placeholder message when nutrition is null", () => {
    render(<NutritionFacts nutrition={null} />)
    expect(screen.getByText("Sem informações nutricionais cadastradas.")).toBeInTheDocument()
  })

  it("shows a placeholder message when all macros are null", () => {
    render(
      <NutritionFacts
        nutrition={{ ...base, caloriesPerUnit: null, proteinPerUnit: null, carbsPerUnit: null, fatPerUnit: null }}
      />,
    )
    expect(screen.getByText("Sem informações nutricionais cadastradas.")).toBeInTheDocument()
  })

  it("renders all four macros with rounded values", () => {
    render(<NutritionFacts nutrition={base} />)
    expect(screen.getByText("Informação nutricional")).toBeInTheDocument()
    expect(screen.getByText("245 cal")).toBeInTheDocument()
    expect(screen.getByText("12.3g")).toBeInTheDocument()
    expect(screen.getByText("30.6g")).toBeInTheDocument()
    expect(screen.getByText("8.1g")).toBeInTheDocument()
    expect(screen.getByText("Proteína")).toBeInTheDocument()
    expect(screen.getByText("Carboidratos")).toBeInTheDocument()
    expect(screen.getByText("Gordura")).toBeInTheDocument()
  })

  it("renders an em dash for null macros when some are present", () => {
    render(<NutritionFacts nutrition={{ ...base, proteinPerUnit: null }} />)
    expect(screen.getByText("—")).toBeInTheDocument()
    expect(screen.getByText("245 cal")).toBeInTheDocument()
  })
})
