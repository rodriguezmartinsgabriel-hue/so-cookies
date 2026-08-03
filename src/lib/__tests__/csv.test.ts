import { describe, it, expect } from "vitest"
import {
  csvEscape,
  csvRow,
  csvFromSections,
  buildReportCsv,
  fileStamp,
  type CsvSection,
} from "@/lib/csv"
import type { ReportSummary } from "@/lib/reports"

function summary(overrides: Partial<ReportSummary> = {}): ReportSummary {
  return {
    periodKey: "mensal",
    periodLabel: "Mensal",
    periodDays: 30,
    rangeLabel: "04/07/2026 - 02/08/2026",
    generatedAt: "02/08/2026 12:00:00",
    revenue: 1234.5,
    saleCount: 9,
    orderCount: 12,
    averageTicket: 137.16,
    channels: [
      { name: "Balcão", count: 5, percent: 55.6 },
      { name: "iFood", count: 4, percent: 44.4 },
    ],
    topProducts: [{ name: "Cookie; Choc", sold: 10, revenue: 250 }],
    statuses: [
      { status: "CONCLUIDO", label: "Concluído", count: 8 },
      { status: "CANCELADO", label: "Cancelado", count: 4 },
    ],
    delivery: { count: 3, revenue: 120, fees: 10.5, costs: 15.25, net: 94.25 },
    overTime: [
      { name: "29/07", total: 0 },
      { name: "30/07", total: 1234.5 },
    ],
    ...overrides,
  }
}

describe("csvEscape", () => {
  it("escapa separador, aspas e quebras de linha", () => {
    expect(csvEscape('Cookie; Choc "premium"')).toBe('"Cookie; Choc ""premium"""')
    expect(csvEscape("linha 1\nlinha 2")).toBe('"linha 1\nlinha 2"')
  })

  it("deixa valores simples intocados e nulos vazios", () => {
    expect(csvEscape("Balcão")).toBe("Balcão")
    expect(csvEscape(42)).toBe("42")
    expect(csvEscape(null)).toBe("")
    expect(csvEscape(undefined)).toBe("")
  })
})

describe("csvRow / csvFromSections", () => {
  it("junta células com separador de ponto e vírgula", () => {
    expect(csvRow(["Produto", 12, null])).toBe("Produto;12;")
  })

  it("monta blocos com título, cabeçalho e linhas em CRLF", () => {
    const sections: CsvSection[] = [
      { title: "Resumo", headers: ["Métrica", "Valor"], rows: [["Receita", "1.234,50"]] },
    ]
    expect(csvFromSections(sections)).toBe("Resumo\r\nMétrica;Valor\r\nReceita;1.234,50\r\n")
  })
})

describe("fileStamp", () => {
  it("formata data no padrão AAA-MM-DD", () => {
    expect(fileStamp(new Date(2026, 7, 2))).toBe("2026-08-02")
  })
})

describe("buildReportCsv", () => {
  it("gera as 7 seções esperadas", () => {
    const csv = buildReportCsv(summary())
    for (const title of [
      "Relatório",
      "Resumo",
      "Delivery",
      "Vendas por período",
      "Canais",
      "Top produtos",
      "Pedidos por status",
    ]) {
      expect(csv).toContain(title)
    }
  })

  it("formata moeda com vírgula decimal", () => {
    const csv = buildReportCsv(summary())
    expect(csv).toContain("Receita;1234,50")
    expect(csv).toContain("Resultado líquido;94,25")
  })

  it("escapa nomes com separador e mostra participação percentual", () => {
    const csv = buildReportCsv(summary())
    expect(csv).toContain('"Cookie; Choc";10;250,00')
    expect(csv).toContain("Balcão;5;55,6%")
  })

  it("mantém seções de status e delivery vazias quando sem dados", () => {
    const empty = summary({ statuses: [], delivery: { count: 0, revenue: 0, fees: 0, costs: 0, net: 0 } })
    const csv = buildReportCsv(empty)
    expect(csv).toContain("Pedidos por status")
    expect(csv).toContain("Pedidos concluídos;0")
  })
})
