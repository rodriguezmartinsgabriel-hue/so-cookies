"use client"

import { AppShell } from "@/components/layout/AppShell"
import { Skeleton } from "@/components/ui/Skeleton"
import { ErrorState } from "@/components/ui/ErrorState"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Table, THead, TBody, Tr, Th, Td } from "@/components/ui/Table"
import { useQueryData } from "@/hooks/useQueryData"
import type { Ingredient, Product, Recipe, Sale, SaleItem } from "@/lib/entity-types"
import { csvFromSections, downloadCsv, fileStamp } from "@/lib/csv"
import { TrendingUp, AlertTriangle, Package, DollarSign, Percent, Wallet, FileSpreadsheet } from "lucide-react"

export default function IndicadoresPage() {
  const ingredients = useQueryData("ingredients")
  const sales = useQueryData("sales")
  const products = useQueryData("products")
  const recipes = useQueryData("recipes")

  const loading = ingredients.isLoading || sales.isLoading || products.isLoading || recipes.isLoading
  const error = ingredients.error || sales.error || products.error || recipes.error ? "Erro ao carregar dados" : null

  const retryAll = () => {
    ingredients.refetch()
    sales.refetch()
    products.refetch()
    recipes.refetch()
  }

  const lowStockItems = ingredients.data.filter((i: Ingredient) => (i.stockKg || 0) <= (i.minStockKg || 0))
  const totalRevenue = sales.data.reduce((sum: number, s: Sale) => sum + (s.total || 0), 0)
  const totalCost = sales.data.reduce(
    (sum: number, s: Sale) =>
      sum + (s.items || []).reduce((acc: number, it: SaleItem) => acc + (it.product?.cost || 0) * it.qty, 0),
    0,
  )
  const profit = totalRevenue - totalCost
  const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0
  const avgTicket = sales.data.length > 0 ? totalRevenue / sales.data.length : 0
  const activeProducts = products.data.filter((p: Product) => p.active)

  const kpis = [
    {
      icon: DollarSign,
      label: "Receita",
      value: `R$ ${totalRevenue.toFixed(0)}`,
      sub: `${sales.data.length} venda(s) registrada(s)`,
    },
    { icon: Wallet, label: "Lucro Estimado", value: `R$ ${profit.toFixed(0)}`, sub: "receita − custo dos produtos" },
    { icon: Percent, label: "Margem", value: `${margin.toFixed(1)}%`, sub: "sobre a receita total" },
    { icon: TrendingUp, label: "Ticket Médio", value: `R$ ${avgTicket.toFixed(2)}`, sub: "receita ÷ nº de vendas" },
    {
      icon: Package,
      label: "Sabores Ativos",
      value: String(activeProducts.length),
      sub: activeProducts.map((p: Product) => p.name).join(", ") || "Nenhum produto cadastrado",
    },
  ]

  function fmtMoney(value: number): string {
    return value.toFixed(2).replace(".", ",")
  }

  function handleExportCsv() {
    const sections = [
      {
        title: "Indicadores",
        headers: ["Métrica", "Valor"],
        rows: [
          ["Receita", fmtMoney(totalRevenue)],
          ["Lucro estimado", fmtMoney(profit)],
          ["Margem", `${margin.toFixed(1).replace(".", ",")}%`],
          ["Ticket médio", fmtMoney(avgTicket)],
          ["Sabores ativos", activeProducts.length],
        ],
      },
      {
        title: "Alertas de estoque",
        headers: ["Insumo", "Fornecedor", "Estoque (kg)", "Mínimo (kg)"],
        rows: lowStockItems.map((i: Ingredient) => [i.name, i.supplier, i.stockKg, i.minStockKg]),
      },
      {
        title: "Custos por receita",
        headers: ["Receita", "Rendimento", "Custo por unidade"],
        rows: recipes.data.map((r: Recipe) => [
          r.name,
          `${r.yield} ${r.yieldUnit}`,
          fmtMoney(r.yield > 0 ? r.totalCost / r.yield : 0),
        ]),
      },
      {
        title: "Margens por produto",
        headers: ["Produto", "Preço", "Custo", "Margem"],
        rows: activeProducts.map((p: Product) => [
          p.name,
          fmtMoney(p.price || 0),
          fmtMoney(p.cost || 0),
          `${(p.margin || 0).toFixed(1).replace(".", ",")}%`,
        ]),
      },
    ]
    downloadCsv(`indicadores-${fileStamp(new Date())}.csv`, csvFromSections(sections))
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink">Indicadores</h1>
            <p className="text-sm text-muted">Análise baseada nos dados reais do negócio</p>
          </div>
          <Button onClick={handleExportCsv} variant="ghost" size="sm" className="bg-ink/10 hover:bg-ink/20">
            <FileSpreadsheet className="w-4 h-4" />
            Exportar Planilha
          </Button>
        </div>

        {error && <ErrorState message={error} onRetry={retryAll} />}

        {loading ? (
          <div className="space-y-4">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                    <div className="flex-1">
                      <Skeleton className="h-3 w-24 mb-2" />
                      <Skeleton className="h-6 w-20 mb-1" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {kpis.map((kpi) => (
                <Card key={kpi.label} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-cream flex items-center justify-center shrink-0">
                      <kpi.icon className="w-5 h-5 text-muted" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted uppercase tracking-wide">{kpi.label}</p>
                      <p className="text-xl font-bold text-ink mt-1">{kpi.value}</p>
                      <p className="text-xs text-muted mt-1">{kpi.sub}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {lowStockItems.length > 0 && (
              <div className="border border-warning/30 rounded-lg bg-warning/5 p-4">
                <h2 className="text-sm font-semibold text-ink uppercase tracking-wide mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  Alertas de Estoque
                </h2>
                <div className="space-y-2">
                  {lowStockItems.map((item: Ingredient) => (
                    <div key={item.id} className="flex items-center justify-between p-2 bg-paper rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-ink">{item.name}</p>
                        <p className="text-xs text-muted">Fornecedor: {item.supplier}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-danger">{item.stockKg} kg</p>
                        <p className="text-xs text-muted">mín: {item.minStockKg} kg</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Card className="p-4">
              <h2 className="text-sm font-semibold text-ink uppercase tracking-wide mb-3">Custos por Receita</h2>
              <div className="space-y-2">
                {recipes.data.length > 0 ? (
                  recipes.data.map((r: Recipe) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-cream transition-colors"
                    >
                      <span className="text-sm text-ink">{r.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted">
                          Rende {r.yield}
                          {r.yieldUnit}
                        </span>
                        <span className="text-sm font-semibold text-ink">
                          R$ {(r.yield > 0 ? r.totalCost / r.yield : 0).toFixed(3)}/un
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted text-center py-4">Nenhuma receita cadastrada</p>
                )}
              </div>
            </Card>

            <Card className="p-4">
              <h2 className="text-sm font-semibold text-ink uppercase tracking-wide mb-3">Margens por Produto</h2>
              <Table>
                <THead>
                  <Tr>
                    <Th>Produto</Th>
                    <Th className="text-right">Preço</Th>
                    <Th className="text-right">Custo</Th>
                    <Th className="text-right">Margem</Th>
                  </Tr>
                </THead>
                <TBody>
                  {activeProducts.length > 0 ? (
                    activeProducts.map((p: Product) => (
                      <Tr key={p.id}>
                        <Td className="font-medium">{p.name}</Td>
                        <Td className="text-right">R$ {(p.price || 0).toFixed(2)}</Td>
                        <Td className="text-right text-muted">R$ {(p.cost || 0).toFixed(3)}</Td>
                        <Td className="text-right text-success font-medium">{(p.margin || 0).toFixed(1)}%</Td>
                      </Tr>
                    ))
                  ) : (
                    <Tr>
                      <Td colSpan={4} className="text-center py-4 text-muted">
                        Nenhum produto cadastrado
                      </Td>
                    </Tr>
                  )}
                </TBody>
              </Table>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  )
}
