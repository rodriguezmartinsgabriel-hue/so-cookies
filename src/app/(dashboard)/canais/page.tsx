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
import type { SaleChannel } from "@/lib/entity-types"
import { Plus, Edit, Trash2, Store } from "lucide-react"

export default function CanaisPage() {
  const { canEdit } = useRole()
  const { confirm, dialog } = useConfirm()
  const { data: channels, isLoading: loading, error: channelsError, invalidate } = useQueryData("channels")
  const error = channelsError ? "Erro ao carregar canais" : null
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<SaleChannel | null>(null)
  const [form, setForm] = useState({ name: "", commission: "" })

  function openEdit(item: SaleChannel) {
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
    await invalidate()
  }

  async function handleDelete(id: string) {
    if (!(await confirm("Excluir este canal?"))) return
    await repository.channels.delete(id)
    await invalidate()
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
            <Button
              onClick={() => {
                resetForm()
                setShowModal(true)
              }}
            >
              <Plus className="w-4 h-4" />
              Novo Canal
            </Button>
          )}
        </div>

        {error && <ErrorState message={error} onRetry={invalidate} />}

        {loading ? (
          <Card padded={false} className="overflow-hidden">
            <Table>
              <THead>
                <Tr>
                  <Th>
                    <Skeleton className="h-3 w-20" />
                  </Th>
                  <Th className="text-right">
                    <Skeleton className="h-3 w-16 ml-auto" />
                  </Th>
                  <Th className="text-center">
                    <Skeleton className="h-3 w-12 mx-auto" />
                  </Th>
                </Tr>
              </THead>
              <TBody>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Tr key={i}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </Td>
                    <Td className="text-right">
                      <Skeleton className="h-4 w-12 ml-auto" />
                    </Td>
                    <Td className="text-center">
                      <div className="flex justify-center gap-1">
                        <Skeleton className="h-7 w-7" />
                        <Skeleton className="h-7 w-7" />
                      </div>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </Card>
        ) : channels.length === 0 ? (
          <div className="text-center py-8 text-muted border border-dashed border-line rounded-lg">
            Nenhum canal cadastrado. Clique em &quot;Novo Canal&quot; para começar.
          </div>
        ) : (
          <Card padded={false} className="overflow-hidden">
            <Table>
              <THead>
                <Tr>
                  <Th>Canal</Th>
                  <Th className="text-right">Comissão</Th>
                  <Th className="text-center">Ações</Th>
                </Tr>
              </THead>
              <TBody>
                {channels.map((ch: SaleChannel) => (
                  <Tr key={ch.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-cream flex items-center justify-center">
                          <Store className="w-4 h-4 text-muted" strokeWidth={1.5} />
                        </div>
                        <span className="text-sm font-medium text-ink">{ch.name}</span>
                      </div>
                    </Td>
                    <Td className="text-right">{ch.commission > 0 ? `${(ch.commission * 100).toFixed(0)}%` : "—"}</Td>
                    <Td className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {canEdit && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(ch)} aria-label="Editar">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(ch.id)}
                              aria-label="Excluir"
                            >
                              <Trash2 className="w-4 h-4 text-danger" />
                            </Button>
                          </>
                        )}
                      </div>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </Card>
        )}

        <Modal
          open={showModal}
          onClose={() => {
            setShowModal(false)
            resetForm()
          }}
          title={editingItem ? "Editar Canal" : "Novo Canal"}
          size="md"
          footer={
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setShowModal(false)
                  resetForm()
                }}
              >
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSave}>
                Salvar
              </Button>
            </div>
          }
        >
          <div className="p-4 space-y-4">
            <FormField label="Nome" required htmlFor="canal-name">
              <Input
                id="canal-name"
                type="text"
                placeholder="Ex: WhatsApp, iFood..."
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </FormField>
            <FormField label="Comissão (0-1)" htmlFor="canal-commission" hint="Ex: 0.23 = 23% de comissão">
              <Input
                id="canal-commission"
                type="number"
                step="0.01"
                min="0"
                max="1"
                placeholder="0 = sem comissão"
                value={form.commission}
                onChange={(e) => setForm({ ...form, commission: e.target.value })}
              />
            </FormField>
          </div>
        </Modal>
      </div>
      {dialog}
    </AppShell>
  )
}
