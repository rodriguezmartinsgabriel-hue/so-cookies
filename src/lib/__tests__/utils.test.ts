import { describe, it, expect } from "vitest"
import { cn, computeMargin, formatBRL, parseCurrencyPtBr, resolveProductImage, toCatalogProduct } from "@/lib/utils"

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar")
  })

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible")
  })
})

describe("parseCurrencyPtBr", () => {
  it("converte vírgula decimal pt-BR", () => {
    expect(parseCurrencyPtBr("12,50")).toBe(12.5)
  })

  it("aceita ponto decimal", () => {
    expect(parseCurrencyPtBr("12.50")).toBe(12.5)
  })

  it("remove prefixo R$ e espaços", () => {
    expect(parseCurrencyPtBr("R$ 3,99")).toBe(3.99)
  })

  it("trata separador de milhar com vírgula decimal", () => {
    expect(parseCurrencyPtBr("1.234,56")).toBe(1234.56)
  })

  it("retorna NaN para entrada inválida", () => {
    expect(parseCurrencyPtBr("abc")).toBeNaN()
  })
})

describe("computeMargin", () => {
  it("calcula margem percentual sobre o preço", () => {
    expect(computeMargin(10, 6)).toBeCloseTo(40)
  })

  it("retorna 0 quando o preço é zero", () => {
    expect(computeMargin(0, 5)).toBe(0)
  })

  it("retorna 0 para valores negativos", () => {
    expect(computeMargin(-10, 5)).toBe(0)
    expect(computeMargin(10, -5)).toBe(0)
  })

  it("retorna 0 para preço não finito", () => {
    expect(computeMargin(NaN, 5)).toBe(0)
    expect(computeMargin(Infinity, 5)).toBe(0)
  })
})

describe("formatBRL", () => {
  it("formata valor com duas casas decimais", () => {
    expect(formatBRL(12.5)).toBe("R$ 12,50")
  })

  it("usa vírgula como separador decimal", () => {
    expect(formatBRL(1234.56)).toBe("R$ 1.234,56")
  })

  it("formata zero", () => {
    expect(formatBRL(0)).toBe("R$ 0,00")
  })
})

describe("resolveProductImage", () => {
  it("usa a foto do produto quando existe", () => {
    expect(resolveProductImage({ image: "own.jpg" }, { image: "recipe.jpg" })).toBe("own.jpg")
  })

  it("cai para a foto da receita quando o produto não tem foto", () => {
    expect(resolveProductImage({ image: null }, { image: "recipe.jpg" })).toBe("recipe.jpg")
  })

  it("retorna null sem produto nem receita", () => {
    expect(resolveProductImage({ image: null }, { image: null })).toBeNull()
    expect(resolveProductImage({ image: "" }, undefined)).toBeNull()
  })
})

describe("toCatalogProduct", () => {
  it("não vaza custo, margem ou sku", () => {
    const result = toCatalogProduct({
      id: "p1",
      name: "Cookie",
      category: "Doces",
      price: 5,
      unit: "un",
      image: null,
      description: null,
      recipes: [],
    })
    expect(result).toEqual({
      id: "p1",
      name: "Cookie",
      category: "Doces",
      price: 5,
      unit: "un",
      image: null,
      description: null,
      nutrition: null,
    })
  })

  it("usa a foto do produto quando existe", () => {
    const result = toCatalogProduct({
      id: "p1",
      name: "Cookie",
      category: "Doces",
      price: 5,
      unit: "un",
      image: "own.jpg",
      recipes: [{ image: "recipe.jpg", yield: 1, yieldUnit: "un", ingredients: [] }],
    })
    expect(result.image).toBe("own.jpg")
  })

  it("cai para a foto da receita vinculada", () => {
    const result = toCatalogProduct({
      id: "p1",
      name: "Cookie",
      category: "Doces",
      price: 5,
      unit: "un",
      image: null,
      recipes: [{ image: "recipe.jpg", yield: 1, yieldUnit: "un", ingredients: [] }],
    })
    expect(result.image).toBe("recipe.jpg")
  })

  it("retorna nutrition null quando produto não tem receita", () => {
    const result = toCatalogProduct({
      id: "p1",
      name: "Cookie",
      category: "Doces",
      price: 5,
      unit: "un",
      image: null,
      recipes: [],
    })
    expect(result.nutrition).toBeNull()
  })

  it("calcula calorias e macros quando a receita existe", () => {
    const result = toCatalogProduct({
      id: "p1",
      name: "Cookie",
      category: "Doces",
      price: 5,
      unit: "un",
      image: null,
      description: "Cookie de chocolate",
      recipes: [
        {
          image: null,
          yield: 10,
          yieldUnit: "un",
          ingredients: [
            {
              qty: 0.5,
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
      ],
    })
    // 0.5 kg = 500 g → (500/100)*364 = 1820 kcal → ÷ yield 10 = 182 kcal/un
    // (500/100)*10 = 50 g prot → ÷ 10 = 5 g prot/un
    expect(result.description).toBe("Cookie de chocolate")
    expect(result.nutrition).not.toBeNull()
    expect(result.nutrition!.caloriesPerUnit).toBeCloseTo(182, 0)
    expect(result.nutrition!.proteinPerUnit).toBe(5)
    expect(result.nutrition!.ingredients).toEqual([{ name: "Farinha", brand: "A" }])
  })

  it("não vaza costPerKg, stockKg ou supplier", () => {
    const result = toCatalogProduct({
      id: "p1",
      name: "Cookie",
      category: "Doces",
      price: 5,
      unit: "un",
      image: null,
      recipes: [
        {
          image: null,
          yield: 5,
          yieldUnit: "un",
          ingredients: [
            {
              qty: 0.3,
              unit: "kg",
              ingredient: {
                name: "Açúcar",
                brand: null,
                caloriesPer100g: 387,
                proteinPer100g: 0,
                carbsPer100g: 100,
                fatPer100g: 0,
                allergens: [],
                tags: ["VEGANO", "SEM_GLUTEN"],
              },
            },
          ],
        },
      ],
    })
    // Garante que nenhum campo sensível é exposto no objeto final
    expect(result).not.toHaveProperty("cost")
    expect(result).not.toHaveProperty("margin")
    expect(result).not.toHaveProperty("sku")
    expect(result.nutrition).not.toHaveProperty("costPerKg")
    expect(result.nutrition).not.toHaveProperty("stockKg")
  })

  it("agrega alérgenos via união e tags via interseção", () => {
    const result = toCatalogProduct({
      id: "p1",
      name: "Cookie",
      category: "Doces",
      price: 5,
      unit: "un",
      image: null,
      recipes: [
        {
          image: null,
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
                tags: ["VEGANO", "SEM_GLUTEN"],
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
      ],
    })
    expect(result.nutrition!.allergens).toEqual(["GLUTEN", "LACTOSE"])
    // Interseção de {VEGANO, SEM_GLUTEN} ∩ {VEGETARIANO} = ∅
    expect(result.nutrition!.tags).toEqual([])
  })
})
