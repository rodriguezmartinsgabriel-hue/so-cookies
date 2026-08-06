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
import { Badge } from "@/components/ui/Badge"
import { repository } from "@/lib/repository"
import { ChefHat, Clock, CheckCircle, Edit, Trash2 } from "lucide-react"
import type { Production } from "@/lib/entity-types"

const statusConfig: Record<string, { label: string; variant: "success" | "warning" | "neutral"; icon: typeof Clock }> =
  {
    concluido: { label: "Concluído", variant: "success", icon: CheckCircle },
    em_producao: { label: "Em Produção", variant: "warning", icon: ChefHat },
    pendente: { label: "Pendente", variant: "neutral", icon: Clock },
  }

export default function ProducaoPage() {
  const { canEdit, isAdmin } = useRole()
  const { confirm, dialog } = useConfirm()
  const { data: batches, isLoading: loading, error: batchesError, invalidate } = useQueryData("productions")
  const { data: products, error: productsError } = useQueryData("products")
  const error = batchesError || productsError ? "Erro ao carregar produção" : null
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingBatch, setEditingBatch] = useState<Production | null>(null)
  const [formProduct, setFormProduct] = useState("")
  const [formQty, setFormQty] = useState("")
  const [formBatchCode, setFormBatchCode] = useState("")
  const [formNotes, setFormNotes] = useState("")

  const [editForm, setEditForm] = useState({ qty: "", notes: "" })

  async function handleStatusChange(id: string, newStatus: string) {
    const endTime = newStatus === "concluido" ? new Date().toISOString() : undefined
    await repository.productions.updateStatus(id, newStatus, endTime)
    await invalidate()
  }

  async function handleDelete(id: string) {
    if (!(await confirm("Excluir este lote?"))) return
    await repository.productions.delete(id)
    await invalidate()
  }

  function openEdit(batch: Production) {
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
    await invalidate()
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
    await invalidate()
  }

  const pendingCount = batches.filter((b) => b.status === "pendente").length
  const inProgressCount = batches.filter((b) => b.status === "em_producao").length
  const doneCount = batches.filter((b) => b.status === "concluido").length

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
          {canEdit && (
            <Button
              onClick={() => {
                setFormProduct("")
                setFormQty("")
                setFormBatchCode(`LOTE-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`)
                setFormNotes("")
                setShowCreateModal(true)
              }}
            >
              <ChefHat className="w-4 h-4" />
              Novo Lote
            </Button>
          )}
        </div>

        {error && <ErrorState message={error} onRetry={invalidate} />}

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-40 mb-1" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </Card>
            ))}
          </div>
        ) : batches.length === 0 ? (
          <div className="text-center py-8 text-muted border border-dashed border-line rounded-lg">
            Nenhum lote registrado. Clique em &quot;Novo Lote&quot; para começar.
          </div>
        ) : (
          <div className="space-y-2">
            {batches.map((batch) => {
              const cfg = statusConfig[batch.status] || statusConfig.pendente
              const Icon = cfg.icon
              return (
                <Card key={batch.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-cream flex items-center justify-center">
                        <Icon className="w-5 h-5 text-muted" strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-ink">{batch.product?.name || batch.batchCode}</p>
                        <p className="text-xs text-muted">
                          Lote {batch.batchCode} · {batch.qty} unidades
                        </p>
                        {batch.notes && <p className="text-xs text-muted mt-0.5 italic">{batch.notes}</p>}
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      <div className="flex gap-1">
                        {canEdit && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(batch)} aria-label="Editar">
                              <Edit className="w-4 h-4" />
                            </Button>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(batch.id)}
                                aria-label="Excluir"
                              >
                                <Trash2 className="w-4 h-4 text-danger" />
                              </Button>
                            )}
                            {batch.status === "pendente" && (
                              <button
                                type="button"
                                onClick={() => handleStatusChange(batch.id, "em_producao")}
                                className="text-xs px-3 py-1.5 bg-warning/10 text-warning rounded-lg font-medium hover:bg-warning/20 transition-colors"
                              >
                                Iniciar
                              </button>
                            )}
                            {batch.status === "em_producao" && (
                              <button
                                type="button"
                                onClick={() => handleStatusChange(batch.id, "concluido")}
                                className="text-xs px-3 py-1.5 bg-success/10 text-success rounded-lg font-medium hover:bg-success/20 transition-colors"
                              >
                                Concluir
                              </button>
                            )}
                          </>
                        )}
                        {batch.status === "concluido" && batch.endTime && (
                          <span className="text-xs text-muted">
                            {new Date(batch.endTime).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        <Modal
          open={showEditModal && !!editingBatch}
          onClose={() => {
            setShowEditModal(false)
            setEditingBatch(null)
          }}
          title={editingBatch ? `Editar Lote ${editingBatch.batchCode}` : "Editar Lote"}
          size="md"
          footer={
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setShowEditModal(false)
                  setEditingBatch(null)
                }}
              >
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleEditSave}>
                Salvar
              </Button>
            </div>
          }
        >
          <div className="p-4 space-y-4">
            <FormField label="Quantidade" htmlFor="edit-qty">
              <Input
                id="edit-qty"
                type="number"
                min="1"
                value={editForm.qty}
                onChange={(e) => setEditForm({ ...editForm, qty: e.target.value })}
              />
            </FormField>
            <FormField label="Observações" htmlFor="edit-notes">
              <textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                rows={3}
                placeholder="Ex: Temperatura do forno..."
                className="w-full px-3 py-2 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors resize-none"
              />
            </FormField>
          </div>
        </Modal>

        <Modal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Novo Lote"
          size="md"
          footer={
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setShowCreateModal(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleCreateBatch}>
                Criar Lote
              </Button>
            </div>
          }
        >
          <div className="p-4 space-y-4">
            <FormField label="Produto" required htmlFor="create-product">
              <select
                id="create-product"
                value={formProduct}
                onChange={(e) => setFormProduct(e.target.value)}
                className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink bg-paper"
              >
                <option value="">Selecionar produto</option>
                {products
                  .filter((p) => p.active)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Código do Lote" required htmlFor="create-batch-code">
                <Input
                  id="create-batch-code"
                  type="text"
                  placeholder="LOTE-20260724"
                  value={formBatchCode}
                  onChange={(e) => setFormBatchCode(e.target.value)}
                />
              </FormField>
              <FormField label="Quantidade" required htmlFor="create-qty">
                <Input
                  id="create-qty"
                  type="number"
                  min="1"
                  placeholder="20"
                  value={formQty}
                  onChange={(e) => setFormQty(e.target.value)}
                />
              </FormField>
            </div>
            <FormField label="Observações" htmlFor="create-notes">
              <Input
                id="create-notes"
                type="text"
                placeholder="Ex: Temperatura do forno..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
              />
            </FormField>
          </div>
        </Modal>
      </div>
      {dialog}
    </AppShell>
  )
}
