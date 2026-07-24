"use client"

import { useState, useCallback, useEffect } from "react"
import { AppShell } from "@/components/layout/AppShell"
import { Plus, Search, X, Trash2 } from "lucide-react"

const channelColors: Record<string, string> = {
  iFood: "bg-danger/10 text-danger",
  Rappi: "bg-warning/10 text-warning",
  WhatsApp: "bg-success/10 text-success",
  Direto: "bg-ink/10 text-ink",
};

export default function VendasPage() {
  const [sales, setSales] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [channels, setChannels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)

  const [formChannel, setFormChannel] = useState("")
  const [formItems, setFormItems] = useState<{ productId: string; qty: string; price: string }[]>([])
  const [formTotal, setFormTotal] = useState(0)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [salesResp, prodsResp, channelsResp] = await Promise.allSettled([
        fetch("/api/sales"),
        fetch("/api/products"),
        fetch("/api/channels"),
      ])
      if (salesResp.status === "fulfilled" && salesResp.value.ok) setSales(await salesResp.value.json())
      if (prodsResp.status === "fulfilled" && prodsResp.value.ok) setProducts(await prodsResp.value.json())
      if (channelsResp.status === "fulfilled" && channelsResp.value.ok) setChannels(await channelsResp.value.json())
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filtered = sales.filter(
    (s: any) =>
      (s.channel?.name || s.channel || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.user?.name || "").toLowerCase().includes(search.toLowerCase())
  )

  const totalRevenue = sales.reduce((sum: number, s: any) => sum + (s.total || 0), 0)

  function addItem() {
    setFormItems([...formItems, { productId: "", qty: "1", price: "" }])
  }

  function removeItem(index: number) {
    const updated = [...formItems]
    updated.splice(index, 1)
    setFormItems(updated)
    calcTotal(updated)
  }

  function updateItem(index: number, field: string, value: string) {
    const updated = [...formItems]
    ;(updated[index] as any)[field] = value
    if (field === "productId") {
      const prod = products.find((p: any) => p.id === value)
      if (prod) updated[index].price = String(prod.price)
    }
    setFormItems(updated)
    calcTotal(updated)
  }

  function calcTotal(items = formItems) {
    const total = items.reduce((sum, item) => {
      return sum + (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0)
    }, 0)
    setFormTotal(total)
  }

  async function handleSaveSale() {
    if (!formChannel || formItems.length === 0) return
    const payload = {
      channelId: formChannel,
      total: formTotal,
      items: formItems
        .filter((i) => i.productId && i.qty)
        .map((i) => ({ productId: i.productId, qty: parseInt(i.qty) || 1, price: parseFloat(i.price) || 0 })),
    }
    await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    setShowModal(false)
    setFormChannel("")
    setFormItems([])
    setFormTotal(0)
    await loadData()
  }

  async function handleDeleteSale(id: string) {
    if (!confirm("Excluir esta venda?")) return
    await fetch(`/api/sales/${id}`, { method: "DELETE" })
    await loadData()
  }

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
          <button onClick={() => { setFormChannel(""); setFormItems([]); setFormTotal(0); setShowModal(true); }} className="flex items-center gap-2 h-10 px-4 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors">
            <Plus className="w-4 h-4" />
            Nova Venda
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Buscar por canal..."
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
                    <th className="text-center text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">Ações</th>
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
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => handleDeleteSale(sale.id)} className="p-1.5 rounded-md hover:bg-cream text-danger"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    )
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted">Nenhuma venda registrada</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 bg-ink/30 flex items-center justify-center p-4">
            <div className="bg-paper rounded-xl border border-line shadow-lg w-full max-w-lg max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-line sticky top-0 bg-paper">
                <h3 className="text-lg font-bold text-ink">Nova Venda</h3>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-md hover:bg-cream text-muted"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Canal de Venda *</label>
                  <select value={formChannel} onChange={(e) => setFormChannel(e.target.value)} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink focus:outline-none focus:border-ink transition-colors bg-paper">
                    <option value="">Selecionar canal</option>
                    {channels.map((ch: any) => (
                      <option key={ch.id} value={ch.id}>{ch.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-muted uppercase tracking-wide">Itens</label>
                    <button onClick={addItem} className="flex items-center gap-1 text-xs font-medium text-info hover:text-info/80 transition-colors">
                      <Plus className="w-3 h-3" /> Adicionar Item
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formItems.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 bg-cream/50 rounded-lg p-2">
                        <select value={item.productId} onChange={(e) => updateItem(i, "productId", e.target.value)} className="flex-1 h-9 px-2 border border-line rounded-lg text-xs text-ink focus:outline-none focus:border-ink bg-paper">
                          <option value="">Produto</option>
                          {products.map((p: any) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <input type="number" min="1" placeholder="Qtd" value={item.qty} onChange={(e) => updateItem(i, "qty", e.target.value)} className="w-16 h-9 px-2 border border-line rounded-lg text-xs text-ink placeholder:text-kraft focus:outline-none focus:border-ink bg-paper" />
                        <input type="number" step="0.01" placeholder="Preço" value={item.price} onChange={(e) => updateItem(i, "price", e.target.value)} className="w-24 h-9 px-2 border border-line rounded-lg text-xs text-ink placeholder:text-kraft focus:outline-none focus:border-ink bg-paper" />
                        <span className="text-xs font-semibold text-ink w-16 text-right">R$ {((parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0)).toFixed(2)}</span>
                        <button onClick={() => removeItem(i)} className="p-1 rounded hover:bg-cream text-danger"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-line pt-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">Total</span>
                  <span className="text-xl font-bold text-ink">R$ {formTotal.toFixed(2)}</span>
                </div>
              </div>
              <div className="p-4 border-t border-line flex gap-2 sticky bottom-0 bg-paper">
                <button onClick={() => setShowModal(false)} className="flex-1 h-10 border border-line rounded-lg text-sm font-medium text-ink hover:bg-cream transition-colors">Cancelar</button>
                <button onClick={handleSaveSale} className="flex-1 h-10 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors">Salvar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
