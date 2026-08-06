import { describe, it, expect } from "vitest"
import { computeProductNutrition } from "@/lib/recipe-nutrition"

describe("computeProductNutrition", () => {
  it("retorna null quando não há receitas", () => {
    expect(computeProductNutrition(undefined)).toBeNull()
    expect(computeProductNutrition([])).toBeNull()
  })

  it("retorna null quando yield é zero ou negativo", () => {
    const result = computeProductNutrition([{ yield: 0, yieldUnit: "un", ingredients: [] }])
    expect(result).toBeNull()
  })

  it("soma kcal dos ingredientes e divide pelo yield", () => {
    const result = computeProductNutrition([
      {
        yield: 10,
        yieldUnit: "un",
        ingredients: [
          {
            qty: 0.5, // 500 g
            unit: "kg",
            ingredient: {
              name: "Farinha",
              brand: "A",
              caloriesPer100g: 364,
              proteinPer100g: 10,
              carbsPer100g: 76,
              fatPer100g: 1,
              allergens: ["GLUTEN"],
              tags: ["VEGANO"],
            },
          },
        ],
      },
    ])
    // (500/100)*364 = 1820 → ÷ 10 = 182 kcal/un
    // (500/100)*10 = 50 → ÷ 10 = 5 g prot/un
    expect(result!.caloriesPerUnit).toBeCloseTo(182, 0)
    expect(result!.proteinPerUnit).toBe(5)
    expect(result!.carbsPerUnit).toBe(38)
    expect(result!.fatPerUnit).toBe(0.5)
  })

  it("converte kg para gramas", () => {
    const result = computeProductNutrition([
      {
        yield: 1,
        yieldUnit: "un",
        ingredients: [
          {
            qty: 1, // 1 kg = 1000 g
            unit: "kg",
            ingredient: {
              name: "Açúcar",
              brand: null,
              caloriesPer100g: 387,
              proteinPer100g: 0,
              carbsPer100g: 100,
              fatPer100g: 0,
              allergens: [],
              tags: [],
            },
          },
        ],
      },
    ])
    // (1000/100)*387 = 3870 → ÷ 1 = 3870
    expect(result!.caloriesPerUnit).toBe(3870)
  })

  it("aceita qty em gramas (unit não-kg)", () => {
    const result = computeProductNutrition([
      {
        yield: 4,
        yieldUnit: "un",
        ingredients: [
          {
            qty: 200, // 200 g
            unit: "g",
            ingredient: {
              name: "Chocolate",
              brand: null,
              caloriesPer100g: 546,
              proteinPer100g: 4.9,
              carbsPer100g: 61,
              fatPer100g: 31,
              allergens: ["LACTOSE"],
              tags: ["VEGETARIANO"],
            },
          },
        ],
      },
    ])
    // (200/100)*546 = 1092 → ÷ 4 = 273
    expect(result!.caloriesPerUnit).toBeCloseTo(273, 0)
  })

  it("retorna null em calorias quando ingrediente não tem caloriesPer100g", () => {
    const result = computeProductNutrition([
      {
        yield: 5,
        yieldUnit: "un",
        ingredients: [
          {
            qty: 0.2,
            unit: "kg",
            ingredient: {
              name: "Corante",
              brand: null,
              caloriesPer100g: null,
              proteinPer100g: null,
              carbsPer100g: null,
              fatPer100g: null,
              allergens: [],
              tags: [],
            },
          },
        ],
      },
    ])
    // Sem nenhum macro → retorna null
    expect(result).toBeNull()
  })

  it("agrega alérgenos via união (sem duplicar)", () => {
    const result = computeProductNutrition([
      {
        yield: 5,
        yieldUnit: "un",
        ingredients: [
          {
            qty: 0.2,
            unit: "kg",
            ingredient: {
              name: "Farinha",
              brand: null,
              caloriesPer100g: 364,
              proteinPer100g: 10,
              carbsPer100g: 76,
              fatPer100g: 1,
              allergens: ["GLUTEN"],
              tags: ["VEGANO"],
            },
          },
          {
            qty: 0.1,
            unit: "kg",
            ingredient: {
              name: "Leite",
              brand: null,
              caloriesPer100g: 42,
              proteinPer100g: 3.4,
              carbsPer100g: 5,
              fatPer100g: 1,
              allergens: ["LACTOSE"],
              tags: ["VEGETARIANO"],
            },
          },
        ],
      },
    ])
    expect(result!.allergens).toEqual(["GLUTEN", "LACTOSE"])
  })

  it("tags são interseção entre todos os ingredientes", () => {
    const result = computeProductNutrition([
      {
        yield: 5,
        yieldUnit: "un",
        ingredients: [
          {
            qty: 0.2,
            unit: "kg",
            ingredient: {
              name: "Farinha",
              brand: null,
              caloriesPer100g: 364,
              proteinPer100g: 10,
              carbsPer100g: 76,
              fatPer100g: 1,
              allergens: [],
              tags: ["VEGANO", "SEM_GLUTEN"],
            },
          },
          {
            qty: 0.1,
            unit: "kg",
            ingredient: {
              name: "Açúcar",
              brand: null,
              caloriesPer100g: 387,
              proteinPer100g: 0,
              carbsPer100g: 100,
              fatPer100g: 0,
              allergens: [],
              tags: ["VEGANO", "SEM_GLUTEN", "VEGETARIANO"],
            },
          },
        ],
      },
    ])
    // Interseção: {VEGANO, SEM_GLUTEN}
    expect(result!.tags).toEqual(expect.arrayContaining(["VEGANO", "SEM_GLUTEN"]))
    expect(result!.tags).not.toContain("VEGETARIANO")
  })

  it("lista ingredientes únicos e ordenados", () => {
    const result = computeProductNutrition([
      {
        yield: 5,
        yieldUnit: "un",
        ingredients: [
          {
            qty: 0.1,
            unit: "kg",
            ingredient: {
              name: "Chocolate",
              brand: "X",
              caloriesPer100g: 546,
              proteinPer100g: 4.9,
              carbsPer100g: 61,
              fatPer100g: 31,
              allergens: [],
              tags: [],
            },
          },
          {
            qty: 0.1,
            unit: "kg",
            ingredient: {
              name: "Açúcar",
              brand: null,
              caloriesPer100g: 387,
              proteinPer100g: 0,
              carbsPer100g: 100,
              fatPer100g: 0,
              allergens: [],
              tags: [],
            },
          },
        ],
      },
    ])
    expect(result!.ingredients).toEqual([
      { name: "Açúcar", brand: null },
      { name: "Chocolate", brand: "X" },
    ])
  })
})
