"use client"

import { useState, useEffect, useCallback } from "react"
import { AppShell } from "@/components/layout/AppShell"
import { Plus, Edit, Trash2, X, Store } from "lucide-react"

export default function CanaisPage() {
  const [channels, setChannels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [form, setForm] = useState({ name: "", commission: "" })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const resp = await fetch("/api/channels")
      if (resp.ok) setChannels(await resp.json())
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function openEdit(item: any) {
    setEditingItem(item)
    setForm({ name: item.name || "", commission: String(item.commission ?? 0) })
    setShowModal(true)
  }

  function resetForm() {
    setForm({ name: "", commission: "" })
    setEditingItem(null)
  }

  async function handleSave() {
    if (!form.name) return
    const payload = {
      name: form.name,
      commission: parseFloat(form.commission) || 0,
    }
    if (editingItem) {
      await fetch(`/api/channels/${editingItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    } else {
      await fetch("/api/channels", {
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
    if (!confirm("Excluir este canal?")) return
    await fetch(`/api/channels/${id}`, { method: "DELETE" })
    await loadData()
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">Canais de Venda</h1>
            <p className="text-sm text-muted">{channels.length} canais cadastrados</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex items-center gap-2 h-10 px-4 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Canal
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted">Carregando...</div>
        ) : channels.length === 0 ? (
          <div className="text-center py-8 text-muted border border-dashed border-line rounded-lg">
            Nenhum canal cadastrado. Clique em "Novo Canal" para começar.
          </div>
        ) : (
          <div className="border border-line rounded-lg bg-paper shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line bg-cream">
                    <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">Canal</th>
                    <th className="text-right text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">Comissão</th>
                    <th className="text-center text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {channels.map((ch: any) => (
                    <tr key={ch.id} className="hover:bg-cream/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-cream flex items-center justify-center">
                            <Store className="w-4 h-4 text-muted" strokeWidth={1.5} />
                          </div>
                          <span className="text-sm font-medium text-ink">{ch.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-ink text-right">
                        {ch.commission > 0 ? `${(ch.commission * 100).toFixed(0)}%` : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEdit(ch)} className="p-1.5 rounded-md hover:bg-cream text-muted"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(ch.id)} className="p-1.5 rounded-md hover:bg-cream text-danger"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 bg-ink/30 flex items-center justify-center p-4">
            <div className="bg-paper rounded-xl border border-line shadow-lg w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-line">
                <h3 className="text-lg font-bold text-ink">{editingItem ? "Editar Canal" : "Novo Canal"}</h3>
                <button onClick={() => { setShowModal(false); resetForm(); }} className="p-1.5 rounded-md hover:bg-cream text-muted"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Nome *</label>
                  <input type="text" placeholder="Ex: WhatsApp, iFood..." value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Comissão (0-1)</label>
                  <input type="number" step="0.01" min="0" max="1" placeholder="0 = sem comissão" value={form.commission} onChange={(e) => setForm({ ...form, commission: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors" />
                  <p className="text-[10px] text-muted mt-1">Ex: 0.23 = 23% de comissão</p>
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
