"use client"

import { useState, useMemo } from "react"
import dynamic from "next/dynamic"
import { AppShell } from "@/components/layout/AppShell"
import { Skeleton } from "@/components/ui/Skeleton"
import { ErrorState } from "@/components/ui/ErrorState"
import { useQueryData } from "@/hooks/useQueryData"
import { REPORT_PERIODS, buildReportSummary } from "@/lib/reports"
import { buildReportCsv, downloadCsv, fileStamp } from "@/lib/csv"
import { TrendingUp, DollarSign, ShoppingCart, Package, Truck, FileDown, FileSpreadsheet, Loader2 } from "lucide-react"

const COLORS = ["#C23B2E", "#E0A400", "#2F7A3E", "#111111"]

const ReportCharts = dynamic(() => import("@/components/charts/ReportCharts"), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="border border-line rounded-lg bg-paper p-4 shadow-card">
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-48" />
        </div>
      ))}
    </div>
  ),
})

export default function RelatoriosPage() {
  const [periodKey, setPeriodKey] = useState("mensal")
  const [exporting, setExporting] = useState(false)

  const { data: sales, isLoading: salesLoading, error: salesError } = useQueryData("sales")
  const { data: orders, isLoading: ordersLoading, error: ordersError } = useQueryData("orders")
  const { data: deliveryCosts, isLoading: costsLoading, error: costsError } = useQueryData("deliveryCosts")
  const { data: channels, error: channelsError } = useQueryData("channels")

  const loading = salesLoading || ordersLoading || costsLoading
  const error = salesError || ordersError || costsError || channelsError ? "Erro ao carregar relatórios" : null

  const period = useMemo(() => REPORT_PERIODS.find((p) => p.key === periodKey) ?? REPORT_PERIODS[2], [periodKey])

  const summary = useMemo(
    () => buildReportSummary(sales, orders, deliveryCosts, channels, period),
    [sales, orders, deliveryCosts, channels, period],
  )

  const channelData = summary.channels.map((c, i) => ({
    name: c.name,
    value: c.percent,
    color: COLORS[i % COLORS.length],
  }))

  async function handleExport() {
    if (exporting) return
    setExporting(true)
    try {
      const { downloadReportPdf } = await import("@/lib/report-pdf")
      downloadReportPdf(summary, `relatorio-${period.key}-${fileStamp(new Date())}.pdf`)
    } catch (e) {
      console.error("Erro ao gerar PDF:", e)
    } finally {
      setExporting(false)
    }
  }

  function handleExportCsv() {
    downloadCsv(`relatorio-${period.key}-${fileStamp(new Date())}.csv`, buildReportCsv(summary))
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink">Relatórios</h1>
            <p className="text-sm text-muted">{summary.rangeLabel}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1 border border-line rounded-lg bg-paper p-1">
              {REPORT_PERIODS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriodKey(p.key)}
                  className={`h-8 px-3 rounded-md text-sm font-medium transition-colors ${period.key === p.key ? "bg-ink text-paper" : "text-muted hover:bg-cream"}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 h-8 px-3 rounded-md text-sm font-medium bg-ink/10 text-ink hover:bg-ink/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              Exportar PDF
            </button>
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-2 h-8 px-3 rounded-md text-sm font-medium bg-ink/10 text-ink hover:bg-ink/20 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Exportar Planilha
            </button>
          </div>
        </div>

        {error && <ErrorState message={error} onRetry={() => {}} />}

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="border border-line rounded-lg bg-paper p-4 shadow-card">
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-7 w-20" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="border border-line rounded-lg bg-paper p-4 shadow-card">
                  <Skeleton className="h-4 w-32 mb-4" />
                  <Skeleton className="h-48" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-muted" />
                  <span className="text-xs text-muted uppercase">Receita</span>
                </div>
                <p className="text-2xl font-bold text-ink">{summary.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart className="w-4 h-4 text-muted" />
                  <span className="text-xs text-muted uppercase">Pedidos</span>
                </div>
                <p className="text-2xl font-bold text-ink">{summary.orderCount}</p>
              </div>
              <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-muted" />
                  <span className="text-xs text-muted uppercase">Ticket Médio</span>
                </div>
                <p className="text-2xl font-bold text-ink">R$ {summary.averageTicket.toFixed(2)}</p>
              </div>
              <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-muted" />
                  <span className="text-xs text-muted uppercase">Vendas</span>
                </div>
                <p className="text-2xl font-bold text-ink">{summary.saleCount}</p>
              </div>
            </div>

            <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-info" />
                  <span className="text-xs text-muted uppercase">Receita Delivery (marketplaces)</span>
                </div>
                <div className="flex flex-wrap items-center gap-6">
                  <div>
                    <p className="text-lg font-bold text-ink">R$ {summary.delivery.net.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs text-muted">resultado líquido</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-ink">{summary.delivery.count}</p>
                    <p className="text-xs text-muted">pedidos concluídos</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-danger">R$ {summary.delivery.fees.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs text-muted">taxas</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-danger">R$ {summary.delivery.costs.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs text-muted">custos de entrega</p>
                  </div>
                </div>
              </div>
            </div>

            <ReportCharts salesPerDay={summary.overTime} channelData={channelData} statusData={summary.statuses} />

            <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
              <h2 className="text-sm font-semibold text-ink uppercase tracking-wide mb-4">
                Top Produtos
              </h2>
              <div className="space-y-2">
                {summary.topProducts.length > 0 ? (
                  summary.topProducts.map((product, i) => (
                    <div key={product.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted w-4">{i + 1}.</span>
                        <span className="text-sm text-ink">{product.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted">
                          {product.sold} un
                        </span>
                        <span className="text-sm font-semibold text-ink">
                          R$ {product.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted text-sm py-8">Sem dados</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
