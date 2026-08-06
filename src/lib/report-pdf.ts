import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import type { ReportSummary } from "./reports"

const INK: [number, number, number] = [17, 17, 17]
const MUTED: [number, number, number] = [107, 97, 86]
const CREAM: [number, number, number] = [247, 244, 238]

function brl(value: number): string {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
}

function lastAutoTableY(doc: jsPDF, fallback: number): number {
  const handle = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
  return handle?.finalY ?? fallback
}

function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.setTextColor(...INK)
  doc.text(title.toUpperCase(), 40, y)
  doc.setDrawColor(...INK)
  doc.setLineWidth(1)
  doc.line(40, y + 5, doc.internal.pageSize.getWidth() - 40, y + 5)
  return y + 18
}

export function generateReportPdf(summary: ReportSummary): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 40

  doc.setFillColor(...INK)
  doc.rect(0, 0, pageWidth, 92, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(20)
  doc.text("Relatórios — So Cookies", margin, 40)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(11)
  doc.text(`Período: ${summary.periodLabel} (${summary.rangeLabel})`, margin, 62)
  doc.setTextColor(214, 208, 200)
  doc.setFontSize(9)
  doc.text(`Gerado em: ${summary.generatedAt}`, margin, 78)

  let y = 112

  autoTable(doc, {
    startY: y,
    head: [[{ content: "Receita" }, { content: "Vendas" }, { content: "Pedidos" }, { content: "Ticket médio" }]],
    body: [[brl(summary.revenue), String(summary.saleCount), String(summary.orderCount), brl(summary.averageTicket)]],
    theme: "grid",
    headStyles: { fillColor: INK, textColor: 255, fontSize: 9, fontStyle: "bold", halign: "center" },
    bodyStyles: { fontSize: 15, textColor: INK, fontStyle: "bold", halign: "center", cellPadding: 10 },
    styles: { font: "helvetica" },
    margin: { left: margin, right: margin },
  })
  y = lastAutoTableY(doc, y) + 26

  y = addSectionTitle(doc, "Vendas por período", y)
  autoTable(doc, {
    startY: y,
    head: [["Período", "Receita"]],
    body: summary.overTime.length
      ? summary.overTime.map((o) => [o.name, brl(o.total)])
      : [["Sem dados no período", ""]],
    theme: "grid",
    headStyles: { fillColor: INK, textColor: 255, fontSize: 9, fontStyle: "bold" },
    bodyStyles: { fontSize: 10, textColor: INK },
    alternateRowStyles: { fillColor: CREAM },
    columnStyles: { 1: { halign: "right" } },
    margin: { left: margin, right: margin },
  })
  y = lastAutoTableY(doc, y) + 26

  y = addSectionTitle(doc, "Vendas por canal", y)
  autoTable(doc, {
    startY: y,
    head: [["Canal", "Vendas", "Participação"]],
    body: summary.channels.length
      ? summary.channels.map((c) => [c.name, String(c.count), `${c.percent}%`])
      : [["Sem dados no período", "", ""]],
    theme: "grid",
    headStyles: { fillColor: INK, textColor: 255, fontSize: 9, fontStyle: "bold" },
    bodyStyles: { fontSize: 10, textColor: INK },
    alternateRowStyles: { fillColor: CREAM },
    columnStyles: { 2: { halign: "right" } },
    margin: { left: margin, right: margin },
  })
  y = lastAutoTableY(doc, y) + 26

  y = addSectionTitle(doc, "Top produtos", y)
  autoTable(doc, {
    startY: y,
    head: [["Produto", "Unidades", "Receita"]],
    body: summary.topProducts.length
      ? summary.topProducts.map((p) => [p.name, String(p.sold), brl(p.revenue)])
      : [["Sem dados no período", "", ""]],
    theme: "grid",
    headStyles: { fillColor: INK, textColor: 255, fontSize: 9, fontStyle: "bold" },
    bodyStyles: { fontSize: 10, textColor: INK },
    alternateRowStyles: { fillColor: CREAM },
    columnStyles: { 2: { halign: "right" } },
    margin: { left: margin, right: margin },
  })
  y = lastAutoTableY(doc, y) + 26

  y = addSectionTitle(doc, "Pedidos por status", y)
  autoTable(doc, {
    startY: y,
    head: [["Status", "Pedidos"]],
    body: summary.statuses.length
      ? summary.statuses.map((s) => [s.label, String(s.count)])
      : [["Sem dados no período", ""]],
    theme: "grid",
    headStyles: { fillColor: INK, textColor: 255, fontSize: 9, fontStyle: "bold" },
    bodyStyles: { fontSize: 10, textColor: INK },
    alternateRowStyles: { fillColor: CREAM },
    columnStyles: { 1: { halign: "right" } },
    margin: { left: margin, right: margin },
  })
  y = lastAutoTableY(doc, y) + 26

  y = addSectionTitle(doc, "Receita Delivery (marketplaces)", y)
  autoTable(doc, {
    startY: y,
    head: [["Item", "Valor"]],
    body: [
      ["Pedidos concluídos", String(summary.delivery.count)],
      ["Receita líquida de taxas", brl(summary.delivery.revenue)],
      ["Taxas das plataformas", brl(summary.delivery.fees)],
      ["Custos de entrega (seção Delivery)", brl(summary.delivery.costs)],
      [
        { content: "Resultado líquido do delivery", styles: { fontStyle: "bold" } },
        { content: brl(summary.delivery.net), styles: { fontStyle: "bold" } },
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: INK, textColor: 255, fontSize: 9, fontStyle: "bold" },
    bodyStyles: { fontSize: 10, textColor: INK },
    alternateRowStyles: { fillColor: CREAM },
    columnStyles: { 1: { halign: "right" } },
    margin: { left: margin, right: margin },
  })
  y = lastAutoTableY(doc, y) + 26

  doc.setTextColor(...MUTED)
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.text("Gerado pelo So Cookies a partir dos dados sincronizados no dispositivo.", margin, y + 8)
  void pageWidth

  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 20, { align: "center" })
  }

  return doc
}

export function downloadReportPdf(summary: ReportSummary, fileName: string) {
  const doc = generateReportPdf(summary)
  doc.save(fileName)
}
