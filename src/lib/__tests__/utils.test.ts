import { describe, it, expect } from "vitest"
import { cn, parseCurrencyPtBr } from "@/lib/utils"

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
