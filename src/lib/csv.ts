import type { ReportSummary } from "./reports"

export type CsvValue = string | number | null | undefined

export function csvEscape(value: CsvValue): string {
  const s = value == null ? "" : String(value)
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function csvRow(cells: CsvValue[]): string {
  return cells.map(csvEscape).join(";")
}

export interface CsvSection {
  title: string
  headers: string[]
  rows: CsvValue[][]
}

export function csvFromSections(sections: CsvSection[]): string {
  const lines: string[] = []
  for (const section of sections) {
    lines.push(csvRow([section.title]))
    lines.push(csvRow(section.headers))
    for (const row of section.rows) {
      lines.push(csvRow(row))
    }
    lines.push("")
  }
  return lines.join("\r\n")
}

export function downloadCsv(fileName: string, content: string): void {
  const blob = new Blob(["\ufeff", content], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function fileStamp(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function fmtMoney(value: number): string {
  return value.toFixed(2).replace(".", ",")
}

function fmtPercent(value: number): string {
  return `${value.toFixed(1).replace(".", ",")}%`
}

export function buildReportCsv(summary: ReportSummary): string {
  const sections: CsvSection[] = []

  sections.push({
    title: "Relatório",
    headers: ["Campo", "Valor"],
    rows: [
      ["Período", summary.periodLabel],
      ["Intervalo", summary.rangeLabel],
      ["Gerado em", summary.generatedAt],
    ],
  })

  sections.push({
    title: "Resumo",
    headers: ["Métrica", "Valor"],
    rows: [
      ["Receita", fmtMoney(summary.revenue)],
      ["Vendas", summary.saleCount],
      ["Pedidos", summary.orderCount],
      ["Ticket médio", fmtMoney(summary.averageTicket)],
    ],
  })

  const delivery = summary.delivery
  sections.push({
    title: "Delivery",
    headers: ["Métrica", "Valor"],
    rows: [
      ["Pedidos concluídos", delivery.count],
      ["Receita bruta", fmtMoney(delivery.revenue)],
      ["Taxas", fmtMoney(delivery.fees)],
      ["Custos de entrega", fmtMoney(delivery.costs)],
      ["Resultado líquido", fmtMoney(delivery.net)],
    ],
  })

  sections.push({
    title: "Vendas por período",
    headers: ["Período", "Receita"],
    rows: summary.overTime.map((o) => [o.name, fmtMoney(o.total)]),
  })

  sections.push({
    title: "Canais",
    headers: ["Canal", "Pedidos", "Participação"],
    rows: summary.channels.map((c) => [c.name, c.count, fmtPercent(c.percent)]),
  })

  sections.push({
    title: "Top produtos",
    headers: ["Produto", "Unidades vendidas", "Receita"],
    rows: summary.topProducts.map((p) => [p.name, p.sold, fmtMoney(p.revenue)]),
  })

  sections.push({
    title: "Pedidos por status",
    headers: ["Status", "Pedidos"],
    rows: summary.statuses.map((s) => [s.label, s.count]),
  })

  return csvFromSections(sections)
}
