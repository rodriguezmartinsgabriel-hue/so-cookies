import { describe, it, expect } from "vitest"
import { generateReportPdf } from "@/lib/report-pdf"
import { buildReportSummary, REPORT_PERIODS } from "@/lib/reports"

describe("report-pdf", () => {
  it("gera um PDF válido a partir do resumo", () => {
    const period = REPORT_PERIODS.find((p) => p.key === "mensal")!
    const summary = buildReportSummary([], [], [], [], period)
    const doc = generateReportPdf(summary)
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1)
    const bytes = doc.output("arraybuffer")
    expect(bytes.byteLength).toBeGreaterThan(100)
    expect(doc.output("blob").size).toBeGreaterThan(0)
  })
})
