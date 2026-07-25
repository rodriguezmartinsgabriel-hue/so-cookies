"use client"

import { useState, useEffect, useCallback } from "react"
import { AppShell } from "@/components/layout/AppShell"
import { repository } from "@/lib/repository"
import { ChefHat, Clock, CheckCircle, Plus, X, Edit, Trash2 } from "lucide-react"

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  concluido: { label: "Concluído", color: "text-success bg-success/10", icon: CheckCircle },
  em_producao: { label: "Em Produção", color: "text-warning bg-warning/10", icon: ChefHat },
  pendente: { label: "Pendente", color: "text-muted bg-cream", icon: Clock },
}

export default function ProducaoPage() {
  const [batches, setBatches] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingBatch, setEditingBatch] = useState<any>(null)
  const [formProduct, setFormProduct] = useState("")
  const [formQty, setFormQty] = useState("")
  const [formBatchCode, setFormBatchCode] = useState("")
  const [formNotes, setFormNotes] = useState("")

  const [editForm, setEditForm] = useState({ qty: "", notes: "" })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [batchesData, prodsResp] = await Promise.allSettled([
        repository.productions.getAll(),
        fetch("/api/products").then((r) => r.ok ? r.json() : []),
      ])
      if (batchesData.status === "fulfilled") setBatches(batchesData.value)
      if (prodsResp.status === "fulfilled") setProducts(prodsResp.value)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function handleStatusChange(id: string, newStatus: string) {
    const endTime = newStatus === "concluido" ? new Date().toISOString() : undefined
    await repository.productions.updateStatus(id, newStatus, endTime)
    await loadData()
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este lote?")) return
    await repository.productions.delete(id)
    await loadData()
  }

  function openEdit(batch: any) {
    setEditingBatch(batch)
    setEditForm({ qty: String(batch.qty ?? ""), notes: batch.notes || "" })
    setShowEditModal(true)
  }

  async function handleEditSave() {
    if (!editingBatch) return
    await repository.productions.update(editingBatch.id, {
      qty: parseInt(editForm.qty) || undefined,
      notes: editForm.notes,
    })
    setShowEditModal(false)
    setEditingBatch(null)
    await loadData()
  }

  async function handleCreateBatch() {
    if (!formProduct || !formQty || !formBatchCode) return
    await repository.productions.create({
      batchCode: formBatchCode,
      productId: formProduct,
      qty: parseInt(formQty) || 1,
      status: "pendente",
      notes: formNotes || undefined,
    })
    setShowCreateModal(false)
    setFormProduct("")
    setFormQty("")
    setFormBatchCode("")
    setFormNotes("")
    await loadData()
  }

  const pendingCount = batches.filter((b: any) => b.status === "pendente").length
  const inProgressCount = batches.filter((b: any) => b.status === "em_producao").length
  const doneCount = batches.filter((b: any) => b.status === "concluido").length

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">Produção</h1>
            <p className="text-sm text-muted">
              {batches.length} lotes · {pendingCount} pendentes · {inProgressCount} em produção · {doneCount} concluídos
            </p>
          </div>
          <button onClick={() => { setFormProduct(""); setFormQty(""); setFormBatchCode(`LOTE-${new Date().toISOString().slice(0,10).replace(/-/g,"")}`); setFormNotes(""); setShowCreateModal(true); }} className="flex items-center gap-2 h-10 px-4 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors">
            <ChefHat className="w-4 h-4" />
            Novo Lote
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted">Carregando...</div>
        ) : batches.length === 0 ? (
          <div className="text-center py-8 text-muted border border-dashed border-line rounded-lg">
            Nenhum lote registrado. Clique em &quot;Novo Lote&quot; para começar.
          </div>
        ) : (
          <div className="space-y-2">
            {batches.map((batch: any) => {
              const cfg = statusConfig[batch.status] || statusConfig.pendente
              const Icon = cfg.icon
              return (
                <div key={batch.id} className="border border-line rounded-lg bg-paper p-4 shadow-card">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-cream flex items-center justify-center">
                        <Icon className="w-5 h-5 text-muted" strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-ink">{batch.product?.name || batch.batchCode}</p>
                        <p className="text-xs text-muted">Lote {batch.batchCode} · {batch.qty} unidades</p>
                        {batch.notes && <p className="text-xs text-muted mt-0.5 italic">{batch.notes}</p>}
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${cfg.color}`}>{cfg.label}</span>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(batch)} className="p-1.5 rounded-md hover:bg-cream text-muted"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(batch.id)} className="p-1.5 rounded-md hover:bg-cream text-danger"><Trash2 className="w-4 h-4" /></button>
                        {batch.status === "pendente" && (
                          <button onClick={() => handleStatusChange(batch.id, "em_producao")} className="text-xs px-3 py-1.5 bg-warning/10 text-warning rounded-lg font-medium hover:bg-warning/20 transition-colors">Iniciar</button>
                        )}
                        {batch.status === "em_producao" && (
                          <button onClick={() => handleStatusChange(batch.id, "concluido")} className="text-xs px-3 py-1.5 bg-success/10 text-success rounded-lg font-medium hover:bg-success/20 transition-colors">Concluir</button>
                        )}
                        {batch.status === "concluido" && batch.endTime && (
                          <span className="text-xs text-muted">
                            {new Date(batch.endTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {showEditModal && editingBatch && (
          <div className="fixed inset-0 z-50 bg-ink/30 flex items-center justify-center p-4">
            <div className="bg-paper rounded-xl border border-line shadow-lg w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-line">
                <h3 className="text-lg font-bold text-ink">Editar Lote {editingBatch.batchCode}</h3>
                <button onClick={() => { setShowEditModal(false); setEditingBatch(null); }} className="p-1.5 rounded-md hover:bg-cream text-muted"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Quantidade</label>
                  <input type="number" min="1" value={editForm.qty} onChange={(e) => setEditForm({ ...editForm, qty: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Observações</label>
                  <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={3} placeholder="Ex: Temperatura do forno..." className="w-full px-3 py-2 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors resize-none" />
                </div>
              </div>
              <div className="p-4 border-t border-line flex gap-2">
                <button onClick={() => { setShowEditModal(false); setEditingBatch(null); }} className="flex-1 h-10 border border-line rounded-lg text-sm font-medium text-ink hover:bg-cream transition-colors">Cancelar</button>
                <button onClick={handleEditSave} className="flex-1 h-10 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors">Salvar</button>
              </div>
            </div>
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-ink/30 flex items-center justify-center p-4">
            <div className="bg-paper rounded-xl border border-line shadow-lg w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-line">
                <h3 className="text-lg font-bold text-ink">Novo Lote</h3>
                <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-md hover:bg-cream text-muted"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Produto *</label>
                  <select value={formProduct} onChange={(e) => setFormProduct(e.target.value)} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink focus:outline-none focus:border-ink bg-paper">
                    <option value="">Selecionar produto</option>
                    {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Código do Lote *</label>
                    <input type="text" placeholder="LOTE-20260724" value={formBatchCode} onChange={(e) => setFormBatchCode(e.target.value)} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Quantidade *</label>
                    <input type="number" min="1" placeholder="20" value={formQty} onChange={(e) => setFormQty(e.target.value)} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Observações</label>
                  <input type="text" placeholder="Ex: Temperatura do forno..." value={formNotes} onChange={(e) => setFormNotes(e.target.value)} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink" />
                </div>
              </div>
              <div className="p-4 border-t border-line flex gap-2">
                <button onClick={() => setShowCreateModal(false)} className="flex-1 h-10 border border-line rounded-lg text-sm font-medium text-ink hover:bg-cream transition-colors">Cancelar</button>
                <button onClick={handleCreateBatch} className="flex-1 h-10 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors">Criar Lote</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
