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
      recipes: [],
    })
    expect(result).toEqual({ id: "p1", name: "Cookie", category: "Doces", price: 5, unit: "un", image: null })
  })

  it("usa a foto do produto quando existe", () => {
    const result = toCatalogProduct({
      id: "p1", name: "Cookie", category: "Doces", price: 5, unit: "un",
      image: "own.jpg",
      recipes: [{ image: "recipe.jpg" }],
    })
    expect(result.image).toBe("own.jpg")
  })

  it("cai para a foto da receita vinculada", () => {
    const result = toCatalogProduct({
      id: "p1", name: "Cookie", category: "Doces", price: 5, unit: "un",
      image: null,
      recipes: [{ image: "recipe.jpg" }, { image: "recipe2.jpg" }],
    })
    expect(result.image).toBe("recipe.jpg")
  })
})
