"use client"

import { useState, useEffect } from "react"
import { AppShell } from "@/components/layout/AppShell"
import { db } from "@/lib/db-local"
import { repository } from "@/lib/repository"
import { Plus, ArrowUpRight, ArrowDownLeft, X } from "lucide-react"

export default function CaixaPage() {
  const [showModal, setShowModal] = useState(false)
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [formType, setFormType] = useState<"ENTRADA" | "SAIDA">("ENTRADA")
  const [formCategory, setFormCategory] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formAmount, setFormAmount] = useState("")

  useEffect(() => {
    loadEntries()
  }, [])

  async function loadEntries() {
    setLoading(true)
    try {
      if (navigator.onLine) {
        const resp = await fetch("/api/cashflow")
        if (resp.ok) {
          const data = await resp.json()
          await db.cashFlow.bulkPut(data.map((e: any) => ({ ...e, _synced: true, _updatedAt: new Date().toISOString() })))
          setEntries(data)
          setLoading(false)
          return
        }
      }
    } catch {}
    const local = await db.cashFlow.toArray()
    setEntries(local)
    setLoading(false)
  }

  async function handleSave() {
    if (!formCategory || !formAmount) return
    await repository.cashFlow.create({
      type: formType,
      category: formCategory,
      description: formDescription,
      amount: formType === "SAIDA" ? -Math.abs(parseFloat(formAmount)) : Math.abs(parseFloat(formAmount)),
    })
    setShowModal(false)
    setFormCategory("")
    setFormDescription("")
    setFormAmount("")
    await loadEntries()
  }

  const today = new Date().toISOString().split("T")[0]
  const todayIn = entries
    .filter((e: any) => e.type === "ENTRADA" && e.date?.startsWith(today))
    .reduce((sum: number, e: any) => sum + (e.amount || 0), 0)
  const todayOut = entries
    .filter((e: any) => e.type === "SAIDA" && e.date?.startsWith(today))
    .reduce((sum: number, e: any) => sum + Math.abs(e.amount || 0), 0)
  const todayBalance = todayIn - todayOut

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-ink">Caixa</h1>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 h-10 px-4 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors">
            <Plus className="w-4 h-4" />
            Lançamento
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
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
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted">Carregando...</div>
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {entries.map((entry: any) => (
                    <tr key={entry.id} className="hover:bg-cream/50 transition-colors">
                      <td className="px-4 py-3">
                        {entry.type === "ENTRADA" ? <ArrowUpRight className="w-4 h-4 text-success" /> : <ArrowDownLeft className="w-4 h-4 text-danger" />}
                      </td>
                      <td className="px-4 py-3 text-sm text-ink">{entry.category}</td>
                      <td className="px-4 py-3 text-sm text-muted">{entry.description}</td>
                      <td className={`px-4 py-3 text-sm font-semibold text-right ${(entry.amount || 0) >= 0 ? "text-success" : "text-danger"}`}>
                        R$ {Math.abs(entry.amount || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted">{entry.date}</td>
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
                <h3 className="text-lg font-bold text-ink">Novo Lançamento</h3>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-md hover:bg-cream text-muted"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Tipo</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setFormType("ENTRADA")} className={`h-10 border rounded-lg text-sm font-medium transition-colors ${formType === "ENTRADA" ? "border-success bg-success/10 text-success" : "border-line text-muted hover:bg-cream"}`}>Entrada</button>
                    <button onClick={() => setFormType("SAIDA")} className={`h-10 border rounded-lg text-sm font-medium transition-colors ${formType === "SAIDA" ? "border-danger bg-danger/10 text-danger" : "border-line text-muted hover:bg-cream"}`}>Saída</button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Valor (R$)</label>
                  <input type="number" placeholder="0.00" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Categoria</label>
                  <input type="text" placeholder="Ex: Venda, Compra, Frete..." value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Descrição</label>
                  <input type="text" placeholder="Descrição do lançamento" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors" />
                </div>
              </div>
              <div className="p-4 border-t border-line flex gap-2">
                <button onClick={() => setShowModal(false)} className="flex-1 h-10 border border-line rounded-lg text-sm font-medium text-ink hover:bg-cream transition-colors">Cancelar</button>
                <button onClick={handleSave} className="flex-1 h-10 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors">Salvar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}