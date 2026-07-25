"use client"

import { useState, useCallback, useEffect } from "react"
import { AppShell } from "@/components/layout/AppShell"
import { repository } from "@/lib/repository"
import { Clock, ChefHat, Package, Truck, X, Plus, Check, Edit, Trash2, Ban, ChevronDown, ChevronRight } from "lucide-react"

const columns = [
  { id: "PENDENTE", label: "Pendente", icon: Clock, color: "text-warning", bg: "bg-warning/10" },
  { id: "PRODUCAO", label: "Produção", icon: ChefHat, color: "text-ink", bg: "bg-ink/10" },
  { id: "PRONTO", label: "Pronto", icon: Package, color: "text-success", bg: "bg-success/10" },
  { id: "ENTREGA", label: "Entrega", icon: Truck, color: "text-muted", bg: "bg-cream" },
  { id: "CONCLUIDO", label: "Concluído", icon: Check, color: "text-success", bg: "bg-success/5" },
  { id: "CANCELADO", label: "Cancelado", icon: Ban, color: "text-danger", bg: "bg-danger/5" },
] as const

const statusColors: Record<string, string> = {
  PENDENTE: "border-l-warning",
  PRODUCAO: "border-l-ink",
  PRONTO: "border-l-success",
  ENTREGA: "border-l-muted",
  CONCLUIDO: "border-l-success/50",
  CANCELADO: "border-l-danger",
}

const nextStatus: Record<string, string> = {
  PENDENTE: "PRODUCAO",
  PRODUCAO: "PRONTO",
  PRONTO: "ENTREGA",
  ENTREGA: "CONCLUIDO",
}

const nextStatusLabel: Record<string, string> = {
  PENDENTE: "Produzir",
  PRODUCAO: "Pronto",
  PRONTO: "Entregar",
  ENTREGA: "Concluir",
}

function canCancel(status: string) {
  return status !== "CONCLUIDO" && status !== "CANCELADO"
}

export default function PedidosPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [channels, setChannels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingOrder, setEditingOrder] = useState<any>(null)
  const [view, setView] = useState<"kanban" | "list">("kanban")
  const [showCompleted, setShowCompleted] = useState(false)

  const [formChannel, setFormChannel] = useState("")
  const [formCustomer, setFormCustomer] = useState("")
  const [formItems, setFormItems] = useState<{ productId: string; qty: string; price: string }[]>([])
  const [formTotal, setFormTotal] = useState(0)

  const [editForm, setEditForm] = useState({ customer: "", notes: "" })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [ordersData, prodsResp, channelsData] = await Promise.allSettled([
        repository.orders.getAll(),
        fetch("/api/products").then((r) => r.ok ? r.json() : []),
        repository.channels.getAll(),
      ])
      if (ordersData.status === "fulfilled") setOrders(ordersData.value)
      if (prodsResp.status === "fulfilled") setProducts(prodsResp.value)
      if (channelsData.status === "fulfilled") setChannels(channelsData.value)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const order = orders.find((o: any) => o.id === selectedOrder)

  async function handleStatusChange(orderId: string, newStatus: string) {
    await repository.orders.updateStatus(orderId, newStatus)
    setSelectedOrder(null)
    await loadData()
  }

  async function handleDeleteOrder(id: string) {
    if (!confirm("Excluir este pedido?")) return
    await repository.orders.delete(id)
    setSelectedOrder(null)
    await loadData()
  }

  function openEditModal(o: any) {
    setEditingOrder(o)
    setEditForm({ customer: o.customer || "", notes: o.notes || "" })
    setShowEditModal(true)
  }

  async function handleEditSave() {
    if (!editingOrder) return
    await repository.orders.update(editingOrder.id, editForm)
    setShowEditModal(false)
    setEditingOrder(null)
    await loadData()
  }

  function addItem() {
    setFormItems([...formItems, { productId: "", qty: "1", price: "" }])
  }

  function removeItem(index: number) {
    const updated = [...formItems]
    updated.splice(index, 1)
    setFormItems(updated)
    calcTotal(updated)
  }

  function updateItem(index: number, field: string, value: string) {
    const updated = [...formItems]
    ;(updated[index] as any)[field] = value
    if (field === "productId") {
      const prod = products.find((p: any) => p.id === value)
      if (prod) updated[index].price = String(prod.price)
    }
    setFormItems(updated)
    calcTotal(updated)
  }

  function calcTotal(items = formItems) {
    setFormTotal(items.reduce((sum, item) => sum + (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0), 0))
  }

  async function handleCreateOrder() {
    if (!formChannel || !formCustomer || formItems.length === 0) return
    const channelName = channels.find((c: any) => c.id === formChannel)?.name || formChannel
    await repository.orders.create({
      channel: channelName,
      customer: formCustomer,
      total: formTotal,
      items: formItems.filter((i) => i.productId && i.qty).map((i) => ({
        productId: i.productId,
        qty: parseInt(i.qty) || 1,
        price: parseFloat(i.price) || 0,
      })),
    })
    setShowCreateModal(false)
    setFormChannel("")
    setFormCustomer("")
    setFormItems([])
    setFormTotal(0)
    await loadData()
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-ink">Pedidos</h1>
          <div className="flex items-center gap-2">
            <div className="flex border border-line rounded-lg overflow-hidden">
              <button onClick={() => setView("kanban")} className={`px-3 py-2 text-xs font-medium transition-colors ${view === "kanban" ? "bg-ink text-paper" : "text-muted hover:bg-cream"}`}>Kanban</button>
              <button onClick={() => setView("list")} className={`px-3 py-2 text-xs font-medium transition-colors ${view === "list" ? "bg-ink text-paper" : "text-muted hover:bg-cream"}`}>Lista</button>
            </div>
            <button onClick={() => { setFormChannel(""); setFormCustomer(""); setFormItems([]); setFormTotal(0); setShowCreateModal(true); }} className="flex items-center gap-2 h-10 px-4 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors">
              <Plus className="w-4 h-4" />
              Novo Pedido
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted">Carregando...</div>
        ) : view === "kanban" ? (
          <div className="space-y-4">
            {columns.filter((c) => c.id !== "CONCLUIDO" && c.id !== "CANCELADO").map((col) => {
              const colOrders = orders.filter((o: any) => o.status === col.id)
              return (
                <div key={col.id} className="border border-line rounded-lg bg-paper shadow-card overflow-hidden">
                  <div className={`flex items-center gap-2 px-4 py-3 border-b border-line ${col.bg}`}>
                    <col.icon className={`w-4 h-4 ${col.color}`} strokeWidth={1.5} />
                    <span className="text-sm font-semibold text-ink">{col.label}</span>
                    <span className="text-xs text-muted bg-paper px-2 py-0.5 rounded-full">{colOrders.length}</span>
                  </div>
                  <div className="p-2 space-y-2">
                    {colOrders.map((o: any) => (
                      <button
                        key={o.id}
                        onClick={() => setSelectedOrder(o.id)}
                        className={`w-full text-left p-3 border border-line rounded-lg bg-paper hover:bg-cream/50 transition-colors border-l-4 ${statusColors[o.status] || ""}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-muted">#{o.id.slice(0, 6)}</span>
                          <span className="text-xs text-muted">{o.createdAt ? new Date(o.createdAt).toLocaleDateString("pt-BR") : ""}</span>
                        </div>
                        <p className="text-sm font-medium text-ink truncate">{o.customer}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted">{o.channel} · {(o.items || []).length} itens</span>
                          <span className="text-sm font-bold text-ink">R$ {o.total}</span>
                        </div>
                      </button>
                    ))}
                    {colOrders.length === 0 && (
                      <div className="p-4 text-center text-xs text-muted border border-dashed border-line rounded-lg">Nenhum pedido</div>
                    )}
                  </div>
                </div>
              )
            })}

            {(() => {
              const concludedCount = orders.filter((o: any) => o.status === "CONCLUIDO").length
              const cancelledCount = orders.filter((o: any) => o.status === "CANCELADO").length
              if (concludedCount === 0 && cancelledCount === 0) return null
              return (
                <div className="border border-line rounded-lg bg-paper shadow-card overflow-hidden">
                  <button
                    onClick={() => setShowCompleted(!showCompleted)}
                    className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-cream/50 transition-colors"
                  >
                    {showCompleted ? <ChevronDown className="w-4 h-4 text-muted" /> : <ChevronRight className="w-4 h-4 text-muted" />}
                    <span className="text-sm font-semibold text-muted">Arquivo</span>
                    <span className="text-xs text-muted bg-cream px-2 py-0.5 rounded-full">{concludedCount + cancelledCount}</span>
                  </button>
                  {showCompleted && (
                    <div className="border-t border-line p-2 space-y-2">
                      {orders.filter((o: any) => o.status === "CONCLUIDO" || o.status === "CANCELADO").map((o: any) => (
                        <button
                          key={o.id}
                          onClick={() => setSelectedOrder(o.id)}
                          className={`w-full text-left p-3 border border-line rounded-lg bg-paper hover:bg-cream/50 transition-colors border-l-4 ${statusColors[o.status] || ""}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-muted">#{o.id.slice(0, 6)}</span>
                            <span className="text-xs text-muted">{o.createdAt ? new Date(o.createdAt).toLocaleDateString("pt-BR") : ""}</span>
                          </div>
                          <p className="text-sm font-medium text-ink truncate">{o.customer}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-muted">{o.channel} · R$ {o.total}</span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${o.status === "CANCELADO" ? "bg-danger/10 text-danger" : "bg-success/10 text-success"}`}>{o.status === "CANCELADO" ? "Cancelado" : "Concluído"}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        ) : (
          <div className="border border-line rounded-lg bg-paper shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line bg-cream">
                    <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">ID</th>
                    <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">Cliente</th>
                    <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">Canal</th>
                    <th className="text-right text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">Total</th>
                    <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">Status</th>
                    <th className="text-center text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {orders.map((o: any) => (
                    <tr key={o.id} className="hover:bg-cream/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-ink">#{o.id.slice(0, 6)}</td>
                      <td className="px-4 py-3 text-sm text-ink">{o.customer}</td>
                      <td className="px-4 py-3 text-sm text-muted">{o.channel}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-ink text-right">R$ {o.total}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-muted bg-cream px-2 py-1 rounded-full">{o.status}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEditModal(o)} className="p-1.5 rounded-md hover:bg-cream text-muted"><Edit className="w-4 h-4" /></button>
                          {canCancel(o.status) && (
                            <button onClick={() => handleStatusChange(o.id, "CANCELADO")} className="p-1.5 rounded-md hover:bg-cream text-danger"><Ban className="w-4 h-4" /></button>
                          )}
                          <button onClick={() => handleDeleteOrder(o.id)} className="p-1.5 rounded-md hover:bg-cream text-danger"><Trash2 className="w-4 h-4" /></button>
                          {nextStatus[o.status] && (
                            <button onClick={() => handleStatusChange(o.id, nextStatus[o.status])} className="text-xs px-3 py-1.5 bg-ink text-paper rounded-lg font-medium hover:bg-ink/90 transition-colors">
                              {nextStatusLabel[o.status]}
                            </button>
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

        {order && (
          <div className="fixed inset-0 z-50 bg-ink/30 flex items-center justify-center p-4">
            <div className="bg-paper rounded-xl border border-line shadow-lg w-full max-w-md max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-line">
                <div>
                  <h3 className="text-lg font-bold text-ink">Pedido #{order.id.slice(0, 6)}</h3>
                  <p className="text-xs text-muted">{order.channel} · {order.createdAt ? new Date(order.createdAt).toLocaleDateString("pt-BR") : ""}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-1.5 rounded-md hover:bg-cream text-muted"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-xs text-muted uppercase tracking-wide mb-1">Cliente</p>
                  <p className="text-sm font-medium text-ink">{order.customer}</p>
                </div>
                {order.notes && (
                  <div>
                    <p className="text-xs text-muted uppercase tracking-wide mb-1">Observações</p>
                    <p className="text-sm text-ink">{order.notes}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted uppercase tracking-wide mb-1">Status</p>
                  <span className="text-xs font-medium text-muted bg-cream px-2 py-1 rounded-full">{order.status}</span>
                </div>
                <div>
                  <p className="text-xs text-muted uppercase tracking-wide mb-1">Itens</p>
                  <div className="space-y-1">
                    {(order.items || []).map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-ink">{item.qty}x {item.product?.name || item.productId}</span>
                        <span className="text-muted">R$ {(item.price * item.qty).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t border-line pt-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">Total</span>
                  <span className="text-lg font-bold text-ink">R$ {order.total}</span>
                </div>
              </div>
              <div className="p-4 border-t border-line flex gap-2">
                <button onClick={() => handleDeleteOrder(order.id)} className="h-10 px-3 border border-danger/30 rounded-lg text-sm font-medium text-danger hover:bg-danger/5 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
                <button onClick={() => { setSelectedOrder(null); openEditModal(order); }} className="h-10 px-3 border border-line rounded-lg text-sm font-medium text-ink hover:bg-cream transition-colors">
                  <Edit className="w-4 h-4" />
                </button>
                {canCancel(order.status) && (
                  <button onClick={() => handleStatusChange(order.id, "CANCELADO")} className="h-10 px-3 border border-danger/30 rounded-lg text-sm font-medium text-danger hover:bg-danger/5 transition-colors">
                    <Ban className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => setSelectedOrder(null)} className="flex-1 h-10 border border-line rounded-lg text-sm font-medium text-ink hover:bg-cream transition-colors">Fechar</button>
                {nextStatus[order.status] && (
                  <button onClick={() => handleStatusChange(order.id, nextStatus[order.status])} className="flex-1 h-10 bg-ink text-paper rounded-lg text-sm font-medium transition-colors hover:bg-ink/90">
                    {nextStatusLabel[order.status]}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {showEditModal && editingOrder && (
          <div className="fixed inset-0 z-50 bg-ink/30 flex items-center justify-center p-4">
            <div className="bg-paper rounded-xl border border-line shadow-lg w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-line">
                <h3 className="text-lg font-bold text-ink">Editar Pedido #{editingOrder.id.slice(0, 6)}</h3>
                <button onClick={() => { setShowEditModal(false); setEditingOrder(null); }} className="p-1.5 rounded-md hover:bg-cream text-muted"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Cliente</label>
                  <input type="text" value={editForm.customer} onChange={(e) => setEditForm({ ...editForm, customer: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Observações</label>
                  <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={3} className="w-full px-3 py-2 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors resize-none" />
                </div>
              </div>
              <div className="p-4 border-t border-line flex gap-2">
                <button onClick={() => { setShowEditModal(false); setEditingOrder(null); }} className="flex-1 h-10 border border-line rounded-lg text-sm font-medium text-ink hover:bg-cream transition-colors">Cancelar</button>
                <button onClick={handleEditSave} className="flex-1 h-10 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors">Salvar</button>
              </div>
            </div>
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-ink/30 flex items-center justify-center p-4">
            <div className="bg-paper rounded-xl border border-line shadow-lg w-full max-w-lg max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-line sticky top-0 bg-paper">
                <h3 className="text-lg font-bold text-ink">Novo Pedido</h3>
                <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-md hover:bg-cream text-muted"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Canal *</label>
                    <select value={formChannel} onChange={(e) => setFormChannel(e.target.value)} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink focus:outline-none focus:border-ink bg-paper">
                      <option value="">Selecionar</option>
                      {channels.map((ch: any) => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Cliente *</label>
                    <input type="text" placeholder="Nome do cliente" value={formCustomer} onChange={(e) => setFormCustomer(e.target.value)} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-muted uppercase tracking-wide">Itens</label>
                    <button onClick={addItem} className="flex items-center gap-1 text-xs font-medium text-info"><Plus className="w-3 h-3" /> Adicionar</button>
                  </div>
                  <div className="space-y-2">
                    {formItems.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 bg-cream/50 rounded-lg p-2">
                        <select value={item.productId} onChange={(e) => updateItem(i, "productId", e.target.value)} className="flex-1 h-9 px-2 border border-line rounded-lg text-xs text-ink bg-paper">
                          <option value="">Produto</option>
                          {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <input type="number" min="1" value={item.qty} onChange={(e) => updateItem(i, "qty", e.target.value)} className="w-16 h-9 px-2 border border-line rounded-lg text-xs text-ink bg-paper" />
                        <input type="number" step="0.01" value={item.price} onChange={(e) => updateItem(i, "price", e.target.value)} className="w-24 h-9 px-2 border border-line rounded-lg text-xs text-ink bg-paper" />
                        <button onClick={() => removeItem(i)} className="p-1 text-danger"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t border-line pt-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">Total</span>
                  <span className="text-xl font-bold text-ink">R$ {formTotal.toFixed(2)}</span>
                </div>
              </div>
              <div className="p-4 border-t border-line flex gap-2 sticky bottom-0 bg-paper">
                <button onClick={() => setShowCreateModal(false)} className="flex-1 h-10 border border-line rounded-lg text-sm font-medium text-ink hover:bg-cream">Cancelar</button>
                <button onClick={handleCreateOrder} className="flex-1 h-10 bg-ink text-paper rounded-lg text-sm font-medium hover:bg-ink/90">Criar Pedido</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
