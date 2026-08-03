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
import { Badge } from "@/components/ui/Badge"
import { Modal } from "@/components/ui/Modal"
import { Table, THead, TBody, Tr, Th, Td } from "@/components/ui/Table"
import { repository } from "@/lib/repository"
import { Plus, Search, X, Trash2 } from "lucide-react"
import type { Sale, SaleChannel } from "@/lib/entity-types"

type SaleRow = Sale & { channel?: SaleChannel | string | null; user?: { name?: string } | null }

const channelVariants: Record<string, "neutral" | "success" | "warning" | "danger" | "info" | "accent"> = {
  iFood: "danger",
  Rappi: "warning",
  WhatsApp: "success",
  Direto: "neutral",
};

export default function VendasPage() {
  const { canEdit } = useRole();
  const { confirm, dialog } = useConfirm()
  const { data: sales, isLoading: salesLoading, error: salesError, invalidate } = useQueryData("sales")
  const { data: products, error: productsError } = useQueryData("products")
  const { data: channels, error: channelsError } = useQueryData("channels")
  const loading = salesLoading
  const error = salesError || productsError || channelsError ? "Erro ao carregar vendas" : null
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)

  const [formChannel, setFormChannel] = useState("")
  const [formItems, setFormItems] = useState<{ productId: string; qty: string; price: string }[]>([])
  const [formTotal, setFormTotal] = useState(0)

  const filtered = sales.filter(
    (s: SaleRow) =>
      ((typeof s.channel === "object" && s.channel ? s.channel.name : s.channel) ||
        channels.find((ch) => ch.id === s.channelId)?.name ||
        "").toLowerCase().includes(search.toLowerCase()) ||
      (s.user?.name || "").toLowerCase().includes(search.toLowerCase())
  )

  const totalRevenue = sales.reduce((sum: number, s) => sum + (s.total || 0), 0)

  function addItem() {
    setFormItems([...formItems, { productId: "", qty: "1", price: "" }])
  }

  function removeItem(index: number) {
    const updated = [...formItems]
    updated.splice(index, 1)
    setFormItems(updated)
    calcTotal(updated)
  }

  function updateItem(index: number, field: "productId" | "qty" | "price", value: string) {
    const updated = [...formItems]
    updated[index][field] = value
    if (field === "productId") {
      const prod = products.find((p) => p.id === value)
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
    await repository.sales.create({
      channelId: formChannel,
      total: formTotal,
      items: formItems
        .filter((i) => i.productId && i.qty)
        .map((i) => ({ productId: i.productId, qty: parseInt(i.qty) || 1, price: parseFloat(i.price) || 0 })),
    })
    setShowModal(false)
    setFormChannel("")
    setFormItems([])
    setFormTotal(0)
    await invalidate()
  }

  async function handleDeleteSale(id: string) {
    if (!(await confirm("Excluir esta venda?"))) return
    await repository.sales.delete(id)
    await invalidate()
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
          {canEdit && (
            <Button onClick={() => { setFormChannel(""); setFormItems([]); setFormTotal(0); setShowModal(true); }}>
              <Plus className="w-4 h-4" />
              Nova Venda
            </Button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <Input
            type="text"
            placeholder="Buscar por canal..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4"
          />
        </div>

        {error && (
          <ErrorState message={error} onRetry={invalidate} />
        )}

        {loading ? (
          <Card padded={false} className="overflow-hidden">
            <Table>
              <THead>
                <Tr>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Th key={i}><Skeleton className="h-3 w-16" /></Th>
                  ))}
                </Tr>
              </THead>
              <TBody>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <Td key={j}><Skeleton className="h-4 w-full" /></Td>
                    ))}
                  </Tr>
                ))}
              </TBody>
            </Table>
          </Card>
        ) : (
          <Card padded={false} className="overflow-hidden">
            <Table>
              <THead>
                <Tr>
                  <Th>ID</Th>
                  <Th>Canal</Th>
                  <Th className="text-right">Itens</Th>
                  <Th className="text-right">Total</Th>
                  <Th>Data</Th>
                  <Th className="text-center">Ações</Th>
                </Tr>
              </THead>
              <TBody>
                {filtered.map((sale: SaleRow) => {
                  const channelName = (typeof sale.channel === "object" && sale.channel ? sale.channel.name : sale.channel) || channels.find((ch) => ch.id === sale.channelId)?.name || "—"
                  const channelVariant = channelVariants[channelName] || "neutral"
                  return (
                    <Tr key={sale.id}>
                      <Td className="text-sm font-medium text-ink">#{sale.id.slice(0, 6)}</Td>
                      <Td>
                        <Badge variant={channelVariant}>{channelName}</Badge>
                      </Td>
                      <Td className="text-sm text-muted text-right">{(sale.items || []).length}</Td>
                      <Td className="text-sm font-semibold text-ink text-right">R$ {sale.total}</Td>
                      <Td className="text-sm text-muted">{new Date(sale.createdAt).toLocaleDateString("pt-BR")}</Td>
                      <Td className="text-center">
                        {canEdit && (
                          <button type="button" onClick={() => handleDeleteSale(sale.id)} aria-label="Excluir" className="p-1.5 rounded-md hover:bg-cream text-danger"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </Td>
                    </Tr>
                  )
                })}
                {filtered.length === 0 && (
                  <Tr><Td colSpan={6} className="px-4 py-8 text-center text-sm text-muted">Nenhuma venda registrada</Td></Tr>
                )}
              </TBody>
            </Table>
          </Card>
        )}

        {showModal && (
          <Modal
            open
            onClose={() => setShowModal(false)}
            title="Nova Venda"
            size="md"
            footer={
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Cancelar</Button>
                <Button className="flex-1" onClick={handleSaveSale}>Salvar</Button>
              </div>
            }
          >
            <div className="p-4 space-y-4">
                <div>
                  <label htmlFor="sel-canal-de-venda" className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Canal de Venda *</label>
                  <select id="sel-canal-de-venda" value={formChannel} onChange={(e) => setFormChannel(e.target.value)} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors bg-paper">
                    <option value="">Selecionar canal</option>
                    {channels.map((ch) => (
                      <option key={ch.id} value={ch.id}>{ch.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-muted uppercase tracking-wide">Itens</label>
                    <button type="button" onClick={addItem} className="flex items-center gap-1 text-xs font-medium text-info hover:text-info/80 transition-colors">
                      <Plus className="w-3 h-3" /> Adicionar Item
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formItems.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 bg-cream/50 rounded-lg p-2">
                        <select value={item.productId} onChange={(e) => updateItem(i, "productId", e.target.value)} className="flex-1 h-9 px-2 border border-line rounded-lg text-xs text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink bg-paper">
                          <option value="">Produto</option>
                          {products.filter((p) => p.active).map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <input type="number" min="1" placeholder="Qtd" value={item.qty} onChange={(e) => updateItem(i, "qty", e.target.value)} className="w-16 h-9 px-2 border border-line rounded-lg text-xs text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink bg-paper" />
                        <input type="number" step="0.01" placeholder="Preço" value={item.price} onChange={(e) => updateItem(i, "price", e.target.value)} className="w-24 h-9 px-2 border border-line rounded-lg text-xs text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink bg-paper" />
                        <span className="text-xs font-semibold text-ink w-16 text-right">R$ {((parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0)).toFixed(2)}</span>
                        <button type="button" onClick={() => removeItem(i)} aria-label="Remover" className="p-1 rounded hover:bg-cream text-danger"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-line pt-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">Total</span>
                  <span className="text-xl font-bold text-ink">R$ {formTotal.toFixed(2)}</span>
                </div>
              </div>
          </Modal>
        )}
      </div>
        {dialog}
    </AppShell>
  )
}
