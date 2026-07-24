"use client"

import { useState, useEffect } from "react"
import { AppShell } from "@/components/layout/AppShell"
import { TrendingUp, AlertTriangle, Package, DollarSign } from "lucide-react"

export default function PrevisaoPage() {
  const [ingredients, setIngredients] = useState<any[]>([])
  const [sales, setSales] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [recipes, setRecipes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [ingResp, salesResp, prodsResp, recipesResp] = await Promise.allSettled([
          fetch("/api/ingredients"),
          fetch("/api/sales"),
          fetch("/api/products"),
          fetch("/api/recipes"),
        ])
        if (ingResp.status === "fulfilled" && ingResp.value.ok) setIngredients(await ingResp.value.json())
        if (salesResp.status === "fulfilled" && salesResp.value.ok) setSales(await salesResp.value.json())
        if (prodsResp.status === "fulfilled" && prodsResp.value.ok) setProducts(await prodsResp.value.json())
        if (recipesResp.status === "fulfilled" && recipesResp.value.ok) setRecipes(await recipesResp.value.json())
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const lowStockItems = ingredients.filter((i: any) => (i.stockKg || 0) <= (i.minStockKg || 0))
  const totalRevenue = sales.reduce((sum: number, s: any) => sum + (s.total || 0), 0)
  const avgTicket = sales.length > 0 ? totalRevenue / sales.length : 0
  const activeProducts = products.filter((p: any) => p.active)

  const predictions = [
    {
      icon: DollarSign,
      metric: "Ticket Médio",
      value: `R$ ${avgTicket.toFixed(2)}`,
      confidence: sales.length > 5 ? 85 : 50,
      basedOn: `Baseado em ${sales.length} venda(s) registrada(s)`,
    },
    {
      icon: TrendingUp,
      metric: "Receita Acumulada",
      value: `R$ ${totalRevenue.toFixed(0)}`,
      confidence: 100,
      basedOn: "Total de vendas no sistema",
    },
    {
      icon: Package,
      metric: "Sabores Ativos",
      value: String(activeProducts.length),
      confidence: 100,
      basedOn: activeProducts.map((p: any) => p.name).join(", ") || "Nenhum produto cadastrado",
    },
  ]

  return (
    <AppShell>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Previsão</h1>
          <p className="text-sm text-muted">
            Análise baseada nos dados do negócio
          </p>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted">Carregando...</div>
        ) : (
          <>
            <div className="space-y-3">
              {predictions.map((pred, i) => (
                <div key={i} className="border border-line rounded-lg bg-paper p-4 shadow-card">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-cream flex items-center justify-center shrink-0">
                        <pred.icon className="w-5 h-5 text-muted" strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted uppercase tracking-wide">{pred.metric}</p>
                        <p className="text-xl font-bold text-ink mt-1">{pred.value}</p>
                        <p className="text-xs text-muted mt-1">{pred.basedOn}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs text-muted">
                        {pred.confidence}% confiança
                      </div>
                      <div className="mt-2 w-16 h-1.5 bg-cream rounded-full overflow-hidden">
                        <div className="h-full bg-ink rounded-full" style={{ width: `${pred.confidence}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {lowStockItems.length > 0 && (
              <div className="border border-warning/30 rounded-lg bg-warning/5 p-4">
                <h2 className="text-sm font-semibold text-ink uppercase tracking-wide mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  Alertas de Estoque
                </h2>
                <div className="space-y-2">
                  {lowStockItems.map((item: any) => (
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

            <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
              <h2 className="text-sm font-semibold text-ink uppercase tracking-wide mb-3">
                Custos por Receita
              </h2>
              <div className="space-y-2">
                {recipes.length > 0 ? recipes.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-cream transition-colors">
                    <span className="text-sm text-ink">{r.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted">Rende {r.yield}{r.yieldUnit}</span>
                      <span className="text-sm font-semibold text-ink">R$ {(r.totalCost / r.yield).toFixed(3)}/un</span>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-muted text-center py-4">Nenhuma receita cadastrada</p>
                )}
              </div>
            </div>

            <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
              <h2 className="text-sm font-semibold text-ink uppercase tracking-wide mb-3">
                Margens por Produto
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="text-left text-xs font-semibold text-muted uppercase px-2 py-2">Produto</th>
                      <th className="text-right text-xs font-semibold text-muted uppercase px-2 py-2">Preço</th>
                      <th className="text-right text-xs font-semibold text-muted uppercase px-2 py-2">Custo</th>
                      <th className="text-right text-xs font-semibold text-muted uppercase px-2 py-2">Margem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {activeProducts.length > 0 ? activeProducts.map((p: any) => (
                      <tr key={p.id}>
                        <td className="px-2 py-2 text-ink font-medium">{p.name}</td>
                        <td className="px-2 py-2 text-right text-ink">R$ {p.price.toFixed(2)}</td>
                        <td className="px-2 py-2 text-right text-muted">R$ {p.cost.toFixed(3)}</td>
                        <td className="px-2 py-2 text-right text-success font-medium">{p.margin.toFixed(1)}%</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={4} className="px-2 py-4 text-center text-muted">Nenhum produto cadastrado</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
