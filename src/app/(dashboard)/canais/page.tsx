"use client"

import { useState, useEffect, useCallback } from "react"
import { useFocusTrap } from "@/hooks/useFocusTrap"
import { useRole } from "@/hooks/useRole"
import { AppShell } from "@/components/layout/AppShell"
import { Skeleton } from "@/components/ui/Skeleton"
import { ErrorState } from "@/components/ui/ErrorState"
import { repository } from "@/lib/repository"
import { Plus, Edit, Trash2, X, Store } from "lucide-react"

export default function CanaisPage() {
  const { canEdit } = useRole();
  const [channels, setChannels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const modalRef = useFocusTrap(showModal)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [form, setForm] = useState({ name: "", commission: "" })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await repository.channels.getAll()
      setChannels(data)
    } catch {
      setError("Erro ao carregar canais")
    }
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
      await repository.channels.update(editingItem.id, payload)
    } else {
      await repository.channels.create(payload)
    }
    setShowModal(false)
    resetForm()
    await loadData()
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este canal?")) return
    await repository.channels.delete(id)
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
          {canEdit && (
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="flex items-center gap-2 h-10 px-4 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo Canal
            </button>
          )}
        </div>

        {error && (
          <ErrorState message={error} onRetry={loadData} />
        )}

        {loading ? (
          <div className="border border-line rounded-lg bg-paper shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line bg-cream">
                    <th className="px-4 py-3"><Skeleton className="h-3 w-20" /></th>
                    <th className="px-4 py-3"><Skeleton className="h-3 w-16 ml-auto" /></th>
                    <th className="px-4 py-3"><Skeleton className="h-3 w-12 mx-auto" /></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3"><div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-lg" /><Skeleton className="h-4 w-24" /></div></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-12 ml-auto" /></td>
                      <td className="px-4 py-3"><div className="flex justify-center gap-1"><Skeleton className="h-7 w-7" /><Skeleton className="h-7 w-7" /></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : channels.length === 0 ? (
          <div className="text-center py-8 text-muted border border-dashed border-line rounded-lg">
            Nenhum canal cadastrado. Clique em &quot;Novo Canal&quot; para começar.
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
                          {canEdit && (
                            <>
                              <button onClick={() => openEdit(ch)} aria-label="Editar" className="p-1.5 rounded-md hover:bg-cream text-muted"><Edit className="w-4 h-4" /></button>
                              <button onClick={() => handleDelete(ch.id)} aria-label="Excluir" className="p-1.5 rounded-md hover:bg-cream text-danger"><Trash2 className="w-4 h-4" /></button>
                            </>
                          )}
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
          <div className="fixed inset-0 z-50 bg-ink/30 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="canal-title">
            <div ref={modalRef} className="bg-paper rounded-xl border border-line shadow-lg w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-line">
                <h3 id="canal-title" className="text-lg font-bold text-ink">{editingItem ? "Editar Canal" : "Novo Canal"}</h3>
                <button onClick={() => { setShowModal(false); resetForm(); }} data-close-modal aria-label="Fechar" className="p-1.5 rounded-md hover:bg-cream text-muted"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Nome *</label>
                  <input type="text" placeholder="Ex: WhatsApp, iFood..." value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Comissão (0-1)</label>
                  <input type="number" step="0.01" min="0" max="1" placeholder="0 = sem comissão" value={form.commission} onChange={(e) => setForm({ ...form, commission: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
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
