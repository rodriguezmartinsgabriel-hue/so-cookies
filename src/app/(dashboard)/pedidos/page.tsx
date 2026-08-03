"use client"

import { useState, useEffect } from "react"
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
import { GlassSurface } from "@/components/ui/GlassSurface"
import { Table, THead, TBody, Tr, Th, Td } from "@/components/ui/Table"
import { repository } from "@/lib/repository"
import { Clock, ChefHat, Package, Truck, X, Plus, Check, Edit, Trash2, Ban, ChevronDown, ChevronRight, Smartphone } from "lucide-react"
import type { Order, OrderItem } from "@/lib/entity-types"

const columns = [
  { id: "PENDENTE", label: "Pendente", icon: Clock, color: "text-warning", bg: "bg-warning/10" },
  { id: "CONFIRMADO", label: "Confirmado", icon: Check, color: "text-info", bg: "bg-info/10" },
  { id: "PRODUCAO", label: "Produção", icon: ChefHat, color: "text-ink", bg: "bg-ink/10" },
  { id: "PRONTO", label: "Pronto", icon: Package, color: "text-success", bg: "bg-success/10" },
  { id: "ENTREGA", label: "Entrega", icon: Truck, color: "text-muted", bg: "bg-cream" },
  { id: "CONCLUIDO", label: "Concluído", icon: Check, color: "text-success", bg: "bg-success/5" },
  { id: "CANCELADO", label: "Cancelado", icon: Ban, color: "text-danger", bg: "bg-danger/5" },
] as const

const statusColors: Record<string, string> = {
  PENDENTE: "border-l-warning",
  CONFIRMADO: "border-l-info",
  PRODUCAO: "border-l-ink",
  PRONTO: "border-l-success",
  ENTREGA: "border-l-muted",
  CONCLUIDO: "border-l-success/50",
  CANCELADO: "border-l-danger",
}

const nextStatus: Record<string, string> = {
  PENDENTE: "CONFIRMADO",
  CONFIRMADO: "PRODUCAO",
  PRODUCAO: "PRONTO",
  PRONTO: "ENTREGA",
  ENTREGA: "CONCLUIDO",
}

const nextStatusLabel: Record<string, string> = {
  PENDENTE: "Confirmar",
  CONFIRMADO: "Produzir",
  PRODUCAO: "Pronto",
  PRONTO: "Entregar",
  ENTREGA: "Concluir",
}

function canCancel(status: string) {
  return status !== "CONCLUIDO" && status !== "CANCELADO"
}

export default function PedidosPage() {
  const { canEdit } = useRole();
  const { confirm, dialog } = useConfirm()
  const {
    data: orders,
    isLoading: loading,
    error: ordersError,
    invalidate,
  } = useQueryData("orders");
  const { data: products, error: productsError } = useQueryData("products");
  const { data: channels, error: channelsError } = useQueryData("channels");
  const error = ordersError || productsError || channelsError ? "Erro ao carregar pedidos" : null
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [view, setView] = useState<"kanban" | "list">("kanban")
  const [showCompleted, setShowCompleted] = useState(false)
  const [routes, setRoutes] = useState<{ id: string; name: string; active: boolean }[]>([])
  const [routeFilter, setRouteFilter] = useState<string>("all")

  useEffect(() => {
    fetch("/api/delivery-routes")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setRoutes(data))
      .catch(() => {})
  }, [])

  const routeName = (id: string | null | undefined) => routes.find((r) => r.id === id)?.name ?? null

  const [formChannel, setFormChannel] = useState("")
  const [formCustomer, setFormCustomer] = useState("")
  const [formItems, setFormItems] = useState<{ productId: string; qty: string; price: string }[]>([])
  const [formTotal, setFormTotal] = useState(0)

  const [editForm, setEditForm] = useState({ customer: "", notes: "" })

  const order = orders.find((o) => o.id === selectedOrder)

  async function handleStatusChange(orderId: string, newStatus: string) {
    await repository.orders.updateStatus(orderId, newStatus)
    setSelectedOrder(null)
    await invalidate()
  }

  async function handleDeleteOrder(id: string) {
    if (!(await confirm("Excluir este pedido?"))) return
    await repository.orders.delete(id)
    setSelectedOrder(null)
    await invalidate()
  }

  function openEditModal(o: Order) {
    setEditingOrder(o)
    setEditForm({ customer: o.customer || "", notes: o.notes || "" })
    setShowEditModal(true)
  }

  async function handleEditSave() {
    if (!editingOrder) return
    await repository.orders.update(editingOrder.id, editForm)
    setShowEditModal(false)
    setEditingOrder(null)
    await invalidate()
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
    setFormTotal(items.reduce((sum, item) => sum + (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0), 0))
  }

  async function handleCreateOrder() {
    if (!formChannel || !formCustomer || formItems.length === 0) return
    const channelName = channels.find((c) => c.id === formChannel)?.name || formChannel
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
    await invalidate()
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
            {canEdit && (
              <Button onClick={() => { setFormChannel(""); setFormCustomer(""); setFormItems([]); setFormTotal(0); setShowCreateModal(true); }}>
                <Plus className="w-4 h-4" />
                Novo Pedido
              </Button>
            )}
          </div>
        </div>

        {error && (
          <ErrorState message={error} onRetry={invalidate} />
        )}

        {routes.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setRouteFilter("all")}
              className={`h-8 px-3 border rounded-full text-xs font-medium transition-colors shrink-0 ${
                routeFilter === "all" ? "border-ink bg-ink text-paper" : "border-line text-ink hover:bg-cream"
              }`}
            >
              Todas
            </button>
            {routes.filter((r) => r.active).map((r) => (
              <button
                key={r.id}
                onClick={() => setRouteFilter(routeFilter === r.id ? "all" : r.id)}
                className={`h-8 px-3 border rounded-full text-xs font-medium transition-colors shrink-0 ${
                  routeFilter === r.id ? "border-ink bg-ink text-paper" : "border-line text-ink hover:bg-cream"
                }`}
              >
                {r.name}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} padded={false} className="overflow-hidden">
                <div className="px-4 py-3 border-b border-line">
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="p-2 space-y-2">
                  {Array.from({ length: 2 }).map((_, j) => (
                    <Card key={j} className="p-3">
                      <Skeleton className="h-3 w-16 mb-2" />
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-24" />
                    </Card>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        ) : view === "kanban" ? (
          <div className="space-y-4">
            {columns.filter((c) => c.id !== "CONCLUIDO" && c.id !== "CANCELADO").map((col) => {
              const colOrders = orders.filter((o) => o.status === col.id && (routeFilter === "all" || o.deliveryRouteId === routeFilter))
              return (
                <Card key={col.id} padded={false} className="overflow-hidden">
                  <div className={`flex items-center gap-2 px-4 py-3 border-b border-line ${col.bg}`}>
                    <col.icon className={`w-4 h-4 ${col.color}`} strokeWidth={1.5} />
                    <span className="text-sm font-semibold text-ink">{col.label}</span>
                    <span className="text-xs text-muted bg-paper px-2 py-0.5 rounded-full">{colOrders.length}</span>
                  </div>
                  <div className="p-2 space-y-2">
                    {colOrders.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => setSelectedOrder(o.id)}
                        className={`w-full text-left p-3 border border-line rounded-lg bg-paper hover:bg-cream/50 transition-colors border-l-4 ${statusColors[o.status] || ""}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-muted">#{o.id.slice(0, 6)}</span>
                          <span className="text-xs text-muted">{o.createdAt ? new Date(o.createdAt).toLocaleDateString("pt-BR") : ""}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-ink truncate">{o.customer}</p>
                          {o.customerId && (
                            <Badge variant="info" className="shrink-0" title="Cliente cadastrado pelo app">
                              <Smartphone className="w-3 h-3" /> App
                            </Badge>
                          )}
                        </div>
                        {o.pickupCode && (
                          <p className="text-xs font-bold text-ink tracking-wider mt-1">Retirada: {o.pickupCode}</p>
                        )}
                        {o.deliveryDate && (
                          <p className="text-xs text-muted mt-1">
                            Entrega: {new Date(o.deliveryDate).toLocaleDateString("pt-BR")}
                            {routeName(o.deliveryRouteId) ? ` · ${routeName(o.deliveryRouteId)}` : ""}
                          </p>
                        )}
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
                </Card>
              )
            })}

            {(() => {
              const concludedCount = orders.filter((o) => o.status === "CONCLUIDO").length
              const cancelledCount = orders.filter((o) => o.status === "CANCELADO").length
              if (concludedCount === 0 && cancelledCount === 0) return null
              return (
                <Card padded={false} className="overflow-hidden">
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
                      {orders.filter((o) => o.status === "CONCLUIDO" || o.status === "CANCELADO").map((o) => (
                        <button
                          key={o.id}
                          onClick={() => setSelectedOrder(o.id)}
                          className={`w-full text-left p-3 border border-line rounded-lg bg-paper hover:bg-cream/50 transition-colors border-l-4 ${statusColors[o.status] || ""}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-muted">#{o.id.slice(0, 6)}</span>
                            <span className="text-xs text-muted">{o.createdAt ? new Date(o.createdAt).toLocaleDateString("pt-BR") : ""}</span>
                          </div>
                          <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-ink truncate">{o.customer}</p>
                          {o.customerId && (
                            <Badge variant="info" className="shrink-0" title="Cliente cadastrado pelo app">
                              <Smartphone className="w-3 h-3" /> App
                            </Badge>
                          )}
                        </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-muted">{o.channel} · R$ {o.total}</span>
                            <Badge variant={o.status === "CANCELADO" ? "danger" : "success"}>{o.status === "CANCELADO" ? "Cancelado" : "Concluído"}</Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </Card>
              )
            })()}
          </div>
        ) : (
          <Card padded={false} className="overflow-hidden">
            <Table>
              <THead>
                <Tr>
                  <Th>ID</Th>
                  <Th>Cliente</Th>
                  <Th>Canal</Th>
                  <Th className="text-right">Total</Th>
                  <Th>Status</Th>
                  <Th className="text-center">Ações</Th>
                </Tr>
              </THead>
              <TBody>
                {orders.map((o) => (
                  <Tr key={o.id}>
                    <Td className="text-sm font-medium text-ink">#{o.id.slice(0, 6)}</Td>
                    <Td className="text-sm text-ink">
                      <div className="flex items-center gap-2">
                        {o.customer}
                        {o.customerId && (
                          <Badge variant="info" title="Cliente cadastrado pelo app">
                            <Smartphone className="w-3 h-3" /> App
                          </Badge>
                        )}
                      </div>
                    </Td>
                    <Td className="text-sm text-muted">
                      {o.channel}
                      {o.pickupCode && <span className="ml-2 font-bold text-ink tracking-wider">#{o.pickupCode}</span>}
                      {routeName(o.deliveryRouteId) && (
                        <span className="ml-2 text-xs font-medium text-ink">{routeName(o.deliveryRouteId)}</span>
                      )}
                    </Td>
                    <Td className="text-sm font-semibold text-ink text-right">R$ {o.total}</Td>
                    <Td>
                      <Badge variant="neutral">{o.status}</Badge>
                    </Td>
                    <Td className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {canEdit && (
                          <>
                            <button onClick={() => openEditModal(o)} aria-label="Editar" className="p-1.5 rounded-md hover:bg-cream text-muted"><Edit className="w-4 h-4" /></button>
                            {canCancel(o.status) && (
                              <button onClick={() => handleStatusChange(o.id, "CANCELADO")} className="p-1.5 rounded-md hover:bg-cream text-danger"><Ban className="w-4 h-4" /></button>
                            )}
                            <button onClick={() => handleDeleteOrder(o.id)} aria-label="Excluir" className="p-1.5 rounded-md hover:bg-cream text-danger"><Trash2 className="w-4 h-4" /></button>
                            {nextStatus[o.status] && (
                              <button onClick={() => handleStatusChange(o.id, nextStatus[o.status])} className="text-xs px-3 py-1.5 bg-ink text-paper rounded-lg font-medium hover:bg-ink/90 transition-colors">
                                {nextStatusLabel[o.status]}
                              </button>
                            )}
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

        {order && (
          <div className="fixed inset-0 z-50 bg-ink/30 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="order-detail-title">
            <GlassSurface tone="strong" className="rounded-xl w-full max-w-md max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-line">
                <div>
                  <h3 id="order-detail-title" className="text-lg font-bold text-ink">Pedido #{order.id.slice(0, 6)}</h3>
                  <p className="text-xs text-muted">{order.channel} · {order.createdAt ? new Date(order.createdAt).toLocaleDateString("pt-BR") : ""}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} data-close-modal aria-label="Fechar" className="p-1.5 rounded-md hover:bg-cream text-muted"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-xs text-muted uppercase tracking-wide mb-1">Cliente</p>
                  <p className="text-sm font-medium text-ink">{order.customer}</p>
                  {order.customerId && (
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 items-center">
                      <Badge variant="info" title="Cliente cadastrado pelo app">
                        <Smartphone className="w-3 h-3" /> Do app
                      </Badge>
                      {order.customerRef?.email && <span className="text-xs text-muted truncate">{order.customerRef.email}</span>}
                      {order.customerRef?.phone && <span className="text-xs text-muted">{order.customerRef.phone}</span>}
                    </div>
                  )}
                </div>
                {order.notes && (
                  <div>
                    <p className="text-xs text-muted uppercase tracking-wide mb-1">Observações</p>
                    <p className="text-sm text-ink">{order.notes}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted uppercase tracking-wide mb-1">Status</p>
                  <Badge variant="neutral">{order.status}</Badge>
                </div>
                {order.pickupCode && (
                  <div>
                    <p className="text-xs text-muted uppercase tracking-wide mb-1">Código de retirada</p>
                    <p className="text-sm font-bold text-ink tracking-[0.2em]">{order.pickupCode}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted uppercase tracking-wide mb-1">Itens</p>
                  <div className="space-y-1">
                    {(order.items || []).map((item: OrderItem, i: number) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-ink">{item.qty}x {item.name || item.product?.name || "Item externo"}</span>
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
                {canEdit && (
                  <>
                    <button onClick={() => handleDeleteOrder(order.id)} aria-label="Excluir" className="h-10 px-3 border border-danger/30 rounded-lg text-sm font-medium text-danger hover:bg-danger/5 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <Button variant="secondary" onClick={() => { setSelectedOrder(null); openEditModal(order); }} aria-label="Editar">
                      <Edit className="w-4 h-4" />
                    </Button>
                    {canCancel(order.status) && (
                      <button onClick={() => handleStatusChange(order.id, "CANCELADO")} className="h-10 px-3 border border-danger/30 rounded-lg text-sm font-medium text-danger hover:bg-danger/5 transition-colors">
                        <Ban className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
                <Button variant="secondary" className="flex-1" onClick={() => setSelectedOrder(null)}>Fechar</Button>
                {canEdit && nextStatus[order.status] && (
                  <Button className="flex-1" onClick={() => handleStatusChange(order.id, nextStatus[order.status])}>
                    {nextStatusLabel[order.status]}
                  </Button>
                )}
              </div>
            </GlassSurface>
          </div>
        )}

        {showEditModal && editingOrder && (
          <Modal
            open
            onClose={() => { setShowEditModal(false); setEditingOrder(null); }}
            title={`Editar Pedido #${editingOrder.id.slice(0, 6)}`}
            size="sm"
            footer={
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => { setShowEditModal(false); setEditingOrder(null); }}>Cancelar</Button>
                <Button className="flex-1" onClick={handleEditSave}>Salvar</Button>
              </div>
            }
          >
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Cliente</label>
                <Input type="text" value={editForm.customer} onChange={(e) => setEditForm({ ...editForm, customer: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Observações</label>
                <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={3} className="w-full px-3 py-2 border border-line rounded-lg text-sm text-ink placeholder:text-kraft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors resize-none" />
              </div>
            </div>
          </Modal>
        )}

        {showCreateModal && (
          <Modal
            open
            onClose={() => setShowCreateModal(false)}
            title="Novo Pedido"
            size="md"
            footer={
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
                <Button className="flex-1" onClick={handleCreateOrder}>Criar Pedido</Button>
              </div>
            }
          >
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Canal *</label>
                  <select value={formChannel} onChange={(e) => setFormChannel(e.target.value)} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink bg-paper">
                    <option value="">Selecionar</option>
                    {channels.map((ch) => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Cliente *</label>
                  <Input type="text" placeholder="Nome do cliente" value={formCustomer} onChange={(e) => setFormCustomer(e.target.value)} />
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
                        {products.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <input type="number" min="1" value={item.qty} onChange={(e) => updateItem(i, "qty", e.target.value)} className="w-16 h-9 px-2 border border-line rounded-lg text-xs text-ink bg-paper" />
                      <input type="number" step="0.01" value={item.price} onChange={(e) => updateItem(i, "price", e.target.value)} className="w-24 h-9 px-2 border border-line rounded-lg text-xs text-ink bg-paper" />
                      <button onClick={() => removeItem(i)} aria-label="Remover" className="p-1 text-danger"><X className="w-3 h-3" /></button>
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
