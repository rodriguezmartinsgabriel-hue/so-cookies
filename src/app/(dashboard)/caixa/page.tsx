"use client"

import { useState } from "react"
import { useConfirm } from "@/hooks/useConfirm"
import { useRole } from "@/hooks/useRole"
import { useQueryData } from "@/hooks/useQueryData"
import { AppShell } from "@/components/layout/AppShell"
import { Skeleton } from "@/components/ui/Skeleton"
import { ErrorState } from "@/components/ui/ErrorState"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { FormField } from "@/components/ui/FormField"
import { Modal } from "@/components/ui/Modal"
import { Table, THead, TBody, Tr, Th, Td } from "@/components/ui/Table"
import { repository } from "@/lib/repository"
import { parseCurrencyPtBr } from "@/lib/utils"
import { Plus, ArrowUpRight, ArrowDownLeft, Trash2, Edit } from "lucide-react"
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
  const [showEditModal, setShowEditModal] = useState(false)
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
    const amount = parseCurrencyPtBr(formAmount)
    if (!formCategory || !Number.isFinite(amount) || !formDescription.trim()) return
    await repository.cashFlow.create({
      type: formType,
      category: formCategory,
      description: formDescription.trim(),
      amount,
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
    const amount = parseCurrencyPtBr(editAmount)
    if (!Number.isFinite(amount)) return
    await repository.cashFlow.update(editingEntry.id, {
      type: editType,
      category: editCategory,
      description: editDescription.trim(),
      amount,
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
            <Button onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" />
              Novo Lançamento
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <p className="text-xs font-medium text-muted uppercase tracking-wide">Entradas Hoje</p>
            <p className="text-xl font-bold text-success mt-1">R$ {todayIn.toFixed(0)}</p>
          </Card>
          <Card>
            <p className="text-xs font-medium text-muted uppercase tracking-wide">Saídas Hoje</p>
            <p className="text-xl font-bold text-danger mt-1">R$ {todayOut.toFixed(0)}</p>
          </Card>
          <Card>
            <p className="text-xs font-medium text-muted uppercase tracking-wide">Saldo Hoje</p>
            <p className={`text-xl font-bold mt-1 ${todayBalance >= 0 ? "text-success" : "text-danger"}`}>R$ {todayBalance.toFixed(0)}</p>
          </Card>
          <Card>
            <p className="text-xs font-medium text-muted uppercase tracking-wide">Saldo Mês</p>
            <p className={`text-xl font-bold mt-1 ${(monthIn - monthOut) >= 0 ? "text-success" : "text-danger"}`}>R$ {(monthIn - monthOut).toFixed(0)}</p>
          </Card>
        </div>

        {error && (
          <ErrorState message={error} onRetry={invalidate} />
        )}

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <Skeleton className="h-3 w-20 mb-2" />
                  <Skeleton className="h-7 w-16" />
                </Card>
              ))}
            </div>
            <Card padded={false} className="overflow-hidden">
              <Table>
                <THead className="border-b border-line">
                  <Tr>{Array.from({ length: 6 }).map((_, i) => (<Th key={i}><Skeleton className="h-3 w-16" /></Th>))}</Tr>
                </THead>
                <TBody>{Array.from({ length: 4 }).map((_, i) => (<Tr key={i}>{Array.from({ length: 6 }).map((_, j) => (<Td key={j}><Skeleton className="h-4 w-full" /></Td>))}</Tr>))}</TBody>
              </Table>
            </Card>
          </div>
        ) : (
          <Card padded={false} className="overflow-hidden">
            <Table>
              <THead className="border-b border-line">
                <Tr>
                  <Th>Tipo</Th>
                  <Th>Categoria</Th>
                  <Th>Descrição</Th>
                  <Th className="text-right">Valor</Th>
                  <Th>Data</Th>
                  <Th className="text-center">Ações</Th>
                </Tr>
              </THead>
              <TBody>
                {entries.map((entry) => (
                  <Tr key={entry.id}>
                    <Td>
                      {entry.type === "ENTRADA" ? <ArrowUpRight className="w-4 h-4 text-success" /> : <ArrowDownLeft className="w-4 h-4 text-danger" />}
                    </Td>
                    <Td className="text-sm text-ink">{entry.category}</Td>
                    <Td className="text-sm text-muted">{entry.description}</Td>
                    <Td className={`text-sm font-semibold text-right ${(entry.amount || 0) >= 0 ? "text-success" : "text-danger"}`}>
                      R$ {Math.abs(entry.amount || 0).toFixed(2)}
                    </Td>
                    <Td className="text-sm text-muted">{displayDate(entry.date)}</Td>
                    <Td className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {canEdit && (
                          <>
                            <button onClick={() => openEdit(entry)} aria-label="Editar" className="p-1.5 rounded-md hover:bg-cream text-muted"><Edit className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(entry.id)} aria-label="Excluir" className="p-1.5 rounded-md hover:bg-cream text-danger"><Trash2 className="w-4 h-4" /></button>
                          </>
                        )}
                      </div>
                    </Td>
                  </Tr>
                ))}
                {entries.length === 0 && (
                  <Tr><Td colSpan={6} className="px-4 py-8 text-center text-sm text-muted">Nenhum lançamento</Td></Tr>
                )}
              </TBody>
            </Table>
          </Card>
        )}

        {showModal && (
          <Modal
            open={showModal}
            onClose={() => setShowModal(false)}
            title="Novo Lançamento"
            size="md"
            footer={
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Cancelar</Button>
                <Button className="flex-1" onClick={handleSave}>Salvar</Button>
              </div>
            }
          >
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setFormType("ENTRADA")} className={`h-10 border rounded-lg text-sm font-medium transition-colors ${formType === "ENTRADA" ? "border-success bg-success/10 text-success" : "border-line text-muted hover:bg-cream"}`}>Entrada</button>
                  <button onClick={() => setFormType("SAIDA")} className={`h-10 border rounded-lg text-sm font-medium transition-colors ${formType === "SAIDA" ? "border-danger bg-danger/10 text-danger" : "border-line text-muted hover:bg-cream"}`}>Saída</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Valor (R$)" required>
                  <Input type="number" step="0.01" placeholder="0.00" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} />
                </FormField>
                <FormField label="Data">
                  <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
                </FormField>
              </div>
              <FormField label="Categoria" required>
                <Input type="text" placeholder="Ex: Venda, Compra, Frete..." value={formCategory} onChange={(e) => setFormCategory(e.target.value)} />
              </FormField>
              <FormField label="Descrição" required>
                <Input type="text" placeholder="Descrição do lançamento" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
              </FormField>
            </div>
          </Modal>
        )}

        {showEditModal && editingEntry && (
          <Modal
            open={showEditModal}
            onClose={() => { setShowEditModal(false); setEditingEntry(null); }}
            title="Editar Lançamento"
            size="md"
            footer={
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => { setShowEditModal(false); setEditingEntry(null); }}>Cancelar</Button>
                <Button className="flex-1" onClick={handleEditSave}>Salvar</Button>
              </div>
            }
          >
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setEditType("ENTRADA")} className={`h-10 border rounded-lg text-sm font-medium transition-colors ${editType === "ENTRADA" ? "border-success bg-success/10 text-success" : "border-line text-muted hover:bg-cream"}`}>Entrada</button>
                  <button onClick={() => setEditType("SAIDA")} className={`h-10 border rounded-lg text-sm font-medium transition-colors ${editType === "SAIDA" ? "border-danger bg-danger/10 text-danger" : "border-line text-muted hover:bg-cream"}`}>Saída</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Valor (R$)" required>
                  <Input type="number" step="0.01" placeholder="0.00" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
                </FormField>
                <FormField label="Data">
                  <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                </FormField>
              </div>
              <FormField label="Categoria" required>
                <Input type="text" placeholder="Ex: Venda, Compra, Frete..." value={editCategory} onChange={(e) => setEditCategory(e.target.value)} />
              </FormField>
              <FormField label="Descrição" required>
                <Input type="text" placeholder="Descrição do lançamento" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
              </FormField>
            </div>
          </Modal>
        )}
      </div>
        {dialog}
    </AppShell>
  )
}
