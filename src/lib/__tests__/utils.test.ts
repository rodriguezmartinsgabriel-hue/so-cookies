import { describe, it, expect } from "vitest"
import { cn, computeMargin, formatBRL, parseCurrencyPtBr } from "@/lib/utils"

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
