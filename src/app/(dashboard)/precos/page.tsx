"use client"

import { useState, useEffect, useCallback } from "react"
import { AppShell } from "@/components/layout/AppShell"
import { Plus, Edit, Trash2, X, Tag } from "lucide-react"

export default function PrecosPage() {
  const [tiers, setTiers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTier, setEditingTier] = useState<any>(null)
  const [form, setForm] = useState({ name: "", minQty: "", maxQty: "", price: "", productId: "" })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [tiersResp, prodsResp] = await Promise.all([fetch("/api/price-tiers"), fetch("/api/products")])
      if (tiersResp.ok) setTiers(await tiersResp.json())
      if (prodsResp.ok) setProducts(await prodsResp.json())
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function openEdit(tier: any) {
    setEditingTier(tier)
    setForm({
      name: tier.name || "",
      minQty: String(tier.minQty ?? ""),
      maxQty: tier.maxQty ? String(tier.maxQty) : "",
      price: String(tier.price ?? ""),
      productId: tier.productId || "",
    })
    setShowModal(true)
  }

  function resetForm() {
    setForm({ name: "", minQty: "", maxQty: "", price: "", productId: "" })
    setEditingTier(null)
  }

  async function handleSave() {
    if (!form.name || !form.price) return
    const payload = {
      name: form.name,
      minQty: parseInt(form.minQty) || 1,
      maxQty: form.maxQty ? parseInt(form.maxQty) : null,
      price: parseFloat(form.price) || 0,
      productId: form.productId || undefined,
    }
    if (editingTier) {
      await fetch(`/api/price-tiers/${editingTier.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    } else {
      await fetch("/api/price-tiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    }
    setShowModal(false)
    resetForm()
    await loadData()
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta faixa de preço?")) return
    await fetch(`/api/price-tiers/${id}`, { method: "DELETE" })
    await loadData()
  }

  const assadoTiers = tiers.filter((t: any) => t.name?.toLowerCase().includes("assado"))
  const congeladoTiers = tiers.filter((t: any) => t.name?.toLowerCase().includes("congelado"))
  const otherTiers = tiers.filter((t: any) => !t.name?.toLowerCase().includes("assado") && !t.name?.toLowerCase().includes("congelado"))

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">Faixas de Preço</h1>
            <p className="text-sm text-muted">{tiers.length} faixas cadastradas</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex items-center gap-2 h-10 px-4 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova Faixa
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted">Carregando...</div>
        ) : tiers.length === 0 ? (
          <div className="text-center py-8 text-muted border border-dashed border-line rounded-lg">
            Nenhuma faixa de preço cadastrada.
          </div>
        ) : (
          <>
            {assadoTiers.length > 0 && (
              <div className="border border-line rounded-lg bg-paper shadow-card overflow-hidden">
                <div className="px-4 py-3 bg-cream border-b border-line">
                  <p className="text-sm font-semibold text-ink">Cookies Assados</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-line">
                        <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide px-4 py-2">Faixa</th>
                        <th className="text-right text-xs font-semibold text-muted uppercase tracking-wide px-4 py-2">Qtd Mín</th>
                        <th className="text-right text-xs font-semibold text-muted uppercase tracking-wide px-4 py-2">Qtd Máx</th>
                        <th className="text-right text-xs font-semibold text-muted uppercase tracking-wide px-4 py-2">Preço/Un</th>
                        <th className="text-center text-xs font-semibold text-muted uppercase tracking-wide px-4 py-2">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {assadoTiers.map((tier: any) => (
                        <tr key={tier.id} className="hover:bg-cream/50">
                          <td className="px-4 py-3 text-sm font-medium text-ink">{tier.name}</td>
                          <td className="px-4 py-3 text-sm text-right text-muted">{tier.minQty}</td>
                          <td className="px-4 py-3 text-sm text-right text-muted">{tier.maxQty || "∞"}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-ink text-right">R$ {tier.price.toFixed(2)}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => openEdit(tier)} className="p-1.5 rounded-md hover:bg-cream text-muted"><Edit className="w-4 h-4" /></button>
                              <button onClick={() => handleDelete(tier.id)} className="p-1.5 rounded-md hover:bg-cream text-danger"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {congeladoTiers.length > 0 && (
              <div className="border border-line rounded-lg bg-paper shadow-card overflow-hidden">
                <div className="px-4 py-3 bg-cream border-b border-line">
                  <p className="text-sm font-semibold text-ink">Cookies Congelados (Pacotes)</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-line">
                        <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide px-4 py-2">Faixa</th>
                        <th className="text-right text-xs font-semibold text-muted uppercase tracking-wide px-4 py-2">Qtd</th>
                        <th className="text-right text-xs font-semibold text-muted uppercase tracking-wide px-4 py-2">Preço Pacote</th>
                        <th className="text-right text-xs font-semibold text-muted uppercase tracking-wide px-4 py-2">Preço/Un</th>
                        <th className="text-center text-xs font-semibold text-muted uppercase tracking-wide px-4 py-2">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {congeladoTiers.map((tier: any) => (
                        <tr key={tier.id} className="hover:bg-cream/50">
                          <td className="px-4 py-3 text-sm font-medium text-ink">{tier.name}</td>
                          <td className="px-4 py-3 text-sm text-right text-muted">{tier.minQty}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-ink text-right">R$ {(tier.price * tier.minQty).toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-ink text-right">R$ {tier.price.toFixed(2)}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => openEdit(tier)} className="p-1.5 rounded-md hover:bg-cream text-muted"><Edit className="w-4 h-4" /></button>
                              <button onClick={() => handleDelete(tier.id)} className="p-1.5 rounded-md hover:bg-cream text-danger"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {otherTiers.length > 0 && (
              <div className="border border-line rounded-lg bg-paper shadow-card overflow-hidden">
                <div className="px-4 py-3 bg-cream border-b border-line">
                  <p className="text-sm font-semibold text-ink">Outros</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-line">
                        <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide px-4 py-2">Faixa</th>
                        <th className="text-right text-xs font-semibold text-muted uppercase tracking-wide px-4 py-2">Qtd Mín</th>
                        <th className="text-right text-xs font-semibold text-muted uppercase tracking-wide px-4 py-2">Qtd Máx</th>
                        <th className="text-right text-xs font-semibold text-muted uppercase tracking-wide px-4 py-2">Preço</th>
                        <th className="text-center text-xs font-semibold text-muted uppercase tracking-wide px-4 py-2">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {otherTiers.map((tier: any) => (
                        <tr key={tier.id} className="hover:bg-cream/50">
                          <td className="px-4 py-3 text-sm font-medium text-ink">{tier.name}</td>
                          <td className="px-4 py-3 text-sm text-right text-muted">{tier.minQty}</td>
                          <td className="px-4 py-3 text-sm text-right text-muted">{tier.maxQty || "∞"}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-ink text-right">R$ {tier.price.toFixed(2)}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => openEdit(tier)} className="p-1.5 rounded-md hover:bg-cream text-muted"><Edit className="w-4 h-4" /></button>
                              <button onClick={() => handleDelete(tier.id)} className="p-1.5 rounded-md hover:bg-cream text-danger"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 bg-ink/30 flex items-center justify-center p-4">
            <div className="bg-paper rounded-xl border border-line shadow-lg w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-line">
                <h3 className="text-lg font-bold text-ink">{editingTier ? "Editar Faixa" : "Nova Faixa de Preço"}</h3>
                <button onClick={() => { setShowModal(false); resetForm(); }} className="p-1.5 rounded-md hover:bg-cream text-muted"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Nome da Faixa *</label>
                  <input type="text" placeholder="Ex: Assado 3un" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Qtd Mínima</label>
                    <input type="number" placeholder="1" value={form.minQty} onChange={(e) => setForm({ ...form, minQty: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Qtd Máxima</label>
                    <input type="number" placeholder="Opcional" value={form.maxQty} onChange={(e) => setForm({ ...form, maxQty: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Preço por Unidade (R$) *</label>
                  <input type="number" step="0.01" placeholder="0.00" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Produto (opcional)</label>
                  <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink focus:outline-none focus:border-ink transition-colors bg-paper">
                    <option value="">Todos os produtos</option>
                    {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="p-4 border-t border-line flex gap-2">
                <button onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 h-10 border border-line rounded-lg text-sm font-medium text-ink hover:bg-cream transition-colors">Cancelar</button>
                <button onClick={handleSave} className="flex-1 h-10 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors">Salvar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
