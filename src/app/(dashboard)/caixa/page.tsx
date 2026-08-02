"use client"

import { useState } from "react"
import { useConfirm } from "@/hooks/useConfirm"
import { useFocusTrap } from "@/hooks/useFocusTrap"
import { useRole } from "@/hooks/useRole"
import { useQueryData } from "@/hooks/useQueryData"
import { AppShell } from "@/components/layout/AppShell"
import { Skeleton } from "@/components/ui/Skeleton"
import { ErrorState } from "@/components/ui/ErrorState"
import { repository } from "@/lib/repository"
import { Plus, ArrowUpRight, ArrowDownLeft, X, Trash2, Edit } from "lucide-react"
import type { CashFlow } from "@/lib/entity-types"

function localDateString(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function displayDate(date: string) {
  if (!date) return "—"
  const parts = date.split("T")[0].split("-")
  if (parts.length !== 3) return date
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

export default function CaixaPage() {
  const { canEdit } = useRole();
  const { confirm, dialog } = useConfirm()
  const [showModal, setShowModal] = useState(false)
  const modalRef = useFocusTrap(showModal)
  const [showEditModal, setShowEditModal] = useState(false)
  const editModalRef = useFocusTrap(showEditModal)
  const [editingEntry, setEditingEntry] = useState<CashFlow | null>(null)
  const { data: entries, isLoading: loading, error: entriesError, invalidate } = useQueryData("cashFlow")
  const error = entriesError ? "Erro ao carregar caixa" : null
  const [formType, setFormType] = useState<"ENTRADA" | "SAIDA">("ENTRADA")
  const [formCategory, setFormCategory] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formAmount, setFormAmount] = useState("")
  const [formDate, setFormDate] = useState(localDateString(new Date()))

  const [editType, setEditType] = useState<"ENTRADA" | "SAIDA">("ENTRADA")
  const [editCategory, setEditCategory] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editAmount, setEditAmount] = useState("")
  const [editDate, setEditDate] = useState("")

  async function handleSave() {
    if (!formCategory || !formAmount || !formDescription.trim()) return
    await repository.cashFlow.create({
      type: formType,
      category: formCategory,
      description: formDescription.trim(),
      amount: parseFloat(formAmount),
      date: formDate,
    })
    setShowModal(false)
    setFormCategory("")
    setFormDescription("")
    setFormAmount("")
    setFormDate(localDateString(new Date()))
    await invalidate()
  }

  function openEdit(entry: CashFlow) {
    setEditingEntry(entry)
    setEditType(entry.type)
    setEditCategory(entry.category || "")
    setEditDescription(entry.description || "")
    setEditAmount(String(Math.abs(entry.amount || 0)))
    setEditDate(entry.date ? entry.date.split("T")[0] : "")
    setShowEditModal(true)
  }

  async function handleEditSave() {
    if (!editingEntry || !editCategory || !editAmount || !editDescription.trim()) return
    await repository.cashFlow.update(editingEntry.id, {
      type: editType,
      category: editCategory,
      description: editDescription.trim(),
      amount: parseFloat(editAmount),
      date: editDate,
    })
    setShowEditModal(false)
    setEditingEntry(null)
    await invalidate()
  }

  async function handleDelete(id: string) {
    if (!(await confirm("Excluir este lançamento?"))) return
    await repository.cashFlow.delete(id)
    await invalidate()
  }

  const today = localDateString(new Date())
  const todayIn = entries
    .filter((e) => e.type === "ENTRADA" && e.date?.startsWith(today))
    .reduce((sum: number, e) => sum + (e.amount || 0), 0)
  const todayOut = entries
    .filter((e) => e.type === "SAIDA" && e.date?.startsWith(today))
    .reduce((sum: number, e) => sum + Math.abs(e.amount || 0), 0)
  const todayBalance = todayIn - todayOut

  const monthIn = entries
    .filter((e) => e.type === "ENTRADA" && e.date?.startsWith(today.slice(0, 7)))
    .reduce((sum: number, e) => sum + (e.amount || 0), 0)
  const monthOut = entries
    .filter((e) => e.type === "SAIDA" && e.date?.startsWith(today.slice(0, 7)))
    .reduce((sum: number, e) => sum + Math.abs(e.amount || 0), 0)

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-ink">Caixa</h1>
          {canEdit && (
            <button onClick={() => setShowModal(true)} className="flex items-center gap-2 h-10 px-4 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors">
              <Plus className="w-4 h-4" />
              Novo Lançamento
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">Entradas Hoje</p>
            <p className="text-xl font-bold text-success mt-1">R$ {todayIn.toFixed(0)}</p>
          </div>
          <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">Saídas Hoje</p>
            <p className="text-xl font-bold text-danger mt-1">R$ {todayOut.toFixed(0)}</p>
          </div>
          <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">Saldo Hoje</p>
            <p className={`text-xl font-bold mt-1 ${todayBalance >= 0 ? "text-success" : "text-danger"}`}>R$ {todayBalance.toFixed(0)}</p>
          </div>
          <div className="border border-line rounded-lg bg-paper p-4 shadow-card">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">Saldo Mês</p>
            <p className={`text-xl font-bold mt-1 ${(monthIn - monthOut) >= 0 ? "text-success" : "text-danger"}`}>R$ {(monthIn - monthOut).toFixed(0)}</p>
          </div>
        </div>

        {error && (
          <ErrorState message={error} onRetry={invalidate} />
        )}

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="border border-line rounded-lg bg-paper p-4 shadow-card">
                  <Skeleton className="h-3 w-20 mb-2" />
                  <Skeleton className="h-7 w-16" />
                </div>
              ))}
            </div>
            <div className="border border-line rounded-lg bg-paper shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-line bg-cream">{Array.from({ length: 6 }).map((_, i) => (<th key={i} className="px-4 py-3"><Skeleton className="h-3 w-16" /></th>))}</tr></thead>
                  <tbody className="divide-y divide-line">{Array.from({ length: 4 }).map((_, i) => (<tr key={i}>{Array.from({ length: 6 }).map((_, j) => (<td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>))}</tr>))}</tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-line rounded-lg bg-paper shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line bg-cream">
                    <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">Tipo</th>
                    <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">Categoria</th>
                    <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">Descrição</th>
                    <th className="text-right text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">Valor</th>
                    <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">Data</th>
                    <th className="text-center text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-cream/50 transition-colors">
                      <td className="px-4 py-3">
                        {entry.type === "ENTRADA" ? <ArrowUpRight className="w-4 h-4 text-success" /> : <ArrowDownLeft className="w-4 h-4 text-danger" />}
                      </td>
                      <td className="px-4 py-3 text-sm text-ink">{entry.category}</td>
                      <td className="px-4 py-3 text-sm text-muted">{entry.description}</td>
                      <td className={`px-4 py-3 text-sm font-semibold text-right ${(entry.amount || 0) >= 0 ? "text-success" : "text-danger"}`}>
                        R$ {Math.abs(entry.amount || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted">{displayDate(entry.date)}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {canEdit && (
                            <>
                              <button onClick={() => openEdit(entry)} aria-label="Editar" className="p-1.5 rounded-md hover:bg-cream text-muted"><Edit className="w-4 h-4" /></button>
                              <button onClick={() => handleDelete(entry.id)} aria-label="Excluir" className="p-1.5 rounded-md hover:bg-cream text-danger"><Trash2 className="w-4 h-4" /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {entries.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted">Nenhum lançamento</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 bg-ink/30 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="novo-lancamento-title">
            <div ref={modalRef} className="bg-paper rounded-xl border border-line shadow-lg w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-line">
                <h3 id="novo-lancamento-title" className="text-lg font-bold text-ink">Novo Lançamento</h3>
                <button onClick={() => setShowModal(false)} data-close-modal aria-label="Fechar" className="p-1.5 rounded-md hover:bg-cream text-muted"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Tipo</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setFormType("ENTRADA")} className={`h-10 border rounded-lg text-sm font-medium transition-colors ${formType === "ENTRADA" ? "border-success bg-success/10 text-success" : "border-line text-muted hover:bg-cream"}`}>Entrada</button>
                    <button onClick={() => setFormType("SAIDA")} className={`h-10 border rounded-lg text-sm font-medium transition-colors ${formType === "SAIDA" ? "border-danger bg-danger/10 text-danger" : "border-line text-muted hover:bg-cream"}`}>Saída</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Valor (R$) *</label>
                    <input type="number" step="0.01" placeholder="0.00" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Data</label>
                    <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Categoria *</label>
                  <input type="text" placeholder="Ex: Venda, Compra, Frete..." value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Descrição *</label>
                  <input type="text" placeholder="Descrição do lançamento" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                </div>
              </div>
              <div className="p-4 border-t border-line flex gap-2">
                <button onClick={() => setShowModal(false)} className="flex-1 h-10 border border-line rounded-lg text-sm font-medium text-ink hover:bg-cream transition-colors">Cancelar</button>
                <button onClick={handleSave} className="flex-1 h-10 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors">Salvar</button>
              </div>
            </div>
          </div>
        )}

        {showEditModal && editingEntry && (
          <div className="fixed inset-0 z-50 bg-ink/30 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="edit-lancamento-title">
            <div ref={editModalRef} className="bg-paper rounded-xl border border-line shadow-lg w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-line">
                <h3 id="edit-lancamento-title" className="text-lg font-bold text-ink">Editar Lançamento</h3>
                <button onClick={() => { setShowEditModal(false); setEditingEntry(null); }} data-close-modal aria-label="Fechar" className="p-1.5 rounded-md hover:bg-cream text-muted"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Tipo</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setEditType("ENTRADA")} className={`h-10 border rounded-lg text-sm font-medium transition-colors ${editType === "ENTRADA" ? "border-success bg-success/10 text-success" : "border-line text-muted hover:bg-cream"}`}>Entrada</button>
                    <button onClick={() => setEditType("SAIDA")} className={`h-10 border rounded-lg text-sm font-medium transition-colors ${editType === "SAIDA" ? "border-danger bg-danger/10 text-danger" : "border-line text-muted hover:bg-cream"}`}>Saída</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Valor (R$) *</label>
                    <input type="number" step="0.01" placeholder="0.00" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Data</label>
                    <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Categoria *</label>
                  <input type="text" placeholder="Ex: Venda, Compra, Frete..." value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Descrição *</label>
                  <input type="text" placeholder="Descrição do lançamento" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors" />
                </div>
              </div>
              <div className="p-4 border-t border-line flex gap-2">
                <button onClick={() => { setShowEditModal(false); setEditingEntry(null); }} className="flex-1 h-10 border border-line rounded-lg text-sm font-medium text-ink hover:bg-cream transition-colors">Cancelar</button>
                <button onClick={handleEditSave} className="flex-1 h-10 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors">Salvar</button>
              </div>
            </div>
          </div>
        )}
      </div>
        {dialog}
    </AppShell>
  )
}
