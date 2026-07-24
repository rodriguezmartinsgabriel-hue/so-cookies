"use client"

import { useState } from "react"
import { AppShell } from "@/components/layout/AppShell"
import { useSales } from "@/hooks/useSales"
import { Plus, Search, X } from "lucide-react"

const channelColors: Record<string, string> = {
  iFood: "bg-danger/10 text-danger",
  Rappi: "bg-warning/10 text-warning",
  WhatsApp: "bg-success/10 text-success",
  Direto: "bg-ink/10 text-ink",
}

export default function VendasPage() {
  const { sales, loading } = useSales()
  const [search, setSearch] = useState("")

  const filtered = sales.filter(
    (s: any) =>
      (s.channel?.name || s.channel || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.user?.name || "").toLowerCase().includes(search.toLowerCase())
  )

  const totalRevenue = sales.reduce((sum: number, s: any) => sum + (s.total || 0), 0)

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">Vendas</h1>
            <p className="text-sm text-muted">
              Total: R$ {totalRevenue.toLocaleString("pt-BR")} · {sales.length} vendas
            </p>
          </div>
          <button className="flex items-center gap-2 h-10 px-4 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors">
            <Plus className="w-4 h-4" />
            Nova Venda
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Buscar por cliente ou canal..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors"
          />
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted">Carregando...</div>
        ) : (
          <div className="border border-line rounded-lg bg-paper shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line bg-cream">
                    <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">ID</th>
                    <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">Canal</th>
                    <th className="text-right text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">Itens</th>
                    <th className="text-right text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">Total</th>
                    <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filtered.map((sale: any) => {
                    const channelName = sale.channel?.name || sale.channel || "—"
                    const channelStyle = channelColors[channelName] || "bg-cream text-muted"
                    return (
                      <tr key={sale.id} className="hover:bg-cream/50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-ink">#{sale.id.slice(0, 6)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${channelStyle}`}>{channelName}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted text-right">{(sale.items || []).length}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-ink text-right">R$ {sale.total}</td>
                        <td className="px-4 py-3 text-sm text-muted">{new Date(sale.createdAt).toLocaleDateString("pt-BR")}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}