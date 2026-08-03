"use client"

import { useState, useEffect, useCallback } from "react"
import { useConfirm } from "@/hooks/useConfirm"
import { useRole } from "@/hooks/useRole"
import { AppShell } from "@/components/layout/AppShell"
import { Skeleton } from "@/components/ui/Skeleton"
import { ErrorState } from "@/components/ui/ErrorState"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { FormField } from "@/components/ui/FormField"
import { Input } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { MapPin, Truck, Ban, Plus, Trash2, Edit, Clock, Store, Eye } from "lucide-react"

type Zone = {
  id: string
  name: string
  active: boolean
  _count?: { routes: number; orders: number }
}

type Route = {
  id: string
  name: string
  zoneId: string
  recurring: boolean
  dayOfWeek: number | null
  date: string | null
  startDate: string | null
  endDate: string | null
  cutoffTime: string
  cutoffOffsetDays: number
  capacityEnabled: boolean
  maxOrders: number | null
  maxItems: number | null
  active: boolean
  zone?: { id: string; name: string }
}

type Block = {
  id: string
  zoneId: string
  date: string
  reason: string | null
  zone?: { id: string; name: string }
}

const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

function dayLabel(day: number): string {
  return WEEKDAY_SHORT[day % 7] || String(day)
}

function dateKeyOf(d: string | null | undefined): string {
  if (!d) return ""
  return d.slice(0, 10)
}

function routeSummary(r: Route): string {
  if (!r.recurring) return `Rota extraordinária · ${dateKeyOf(r.date)}`
  const extra = r.startDate || r.endDate ? ` · ${dateKeyOf(r.startDate) || "?"} a ${dateKeyOf(r.endDate) || "∞"}` : ""
  return `${dayLabel(r.dayOfWeek ?? 0)}-feira · cutoff ${r.cutoffTime} (${r.cutoffOffsetDays}d antes)${extra}`
}

async function fetchJson<T>(url: string): Promise<T> {
  const resp = await fetch(url)
  if (!resp.ok) {
    const data = await resp.json().catch(() => null)
    throw new Error(data?.error || "Erro na requisição")
  }
  return resp.json()
}

type RouteForm = {
  name: string
  zoneId: string
  recurring: boolean
  dayOfWeek: string
  date: string
  startDate: string
  endDate: string
  cutoffTime: string
  cutoffOffsetDays: string
  capacityEnabled: boolean
  maxOrders: string
  maxItems: string
  active: boolean
}

const EMPTY_ROUTE_FORM: RouteForm = {
  name: "",
  zoneId: "",
  recurring: true,
  dayOfWeek: "2",
  date: "",
  startDate: "",
  endDate: "",
  cutoffTime: "18:00",
  cutoffOffsetDays: "1",
  capacityEnabled: false,
  maxOrders: "",
  maxItems: "",
  active: true,
}

export default function RotasPage() {
  const { isAdmin } = useRole()
  const { confirm, dialog } = useConfirm()

  const [zones, setZones] = useState<Zone[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showZone, setShowZone] = useState(false)
  const [zoneForm, setZoneForm] = useState({ name: "", active: true })

  const [showRoute, setShowRoute] = useState(false)
  const [routeForm, setRouteForm] = useState<RouteForm>(EMPTY_ROUTE_FORM)
  const [editingRoute, setEditingRoute] = useState<Route | null>(null)
  const [routeError, setRouteError] = useState("")

  const [showBlock, setShowBlock] = useState(false)
  const [blockForm, setBlockForm] = useState({ zoneId: "", date: "", reason: "" })

  const load = useCallback(async () => {
    try {
      const [z, r, b] = await Promise.all([
        fetchJson<Zone[]>("/api/delivery-zones"),
        fetchJson<Route[]>("/api/delivery-routes"),
        fetchJson<Block[]>("/api/delivery-blocks"),
      ])
      setZones(z)
      setRoutes(r)
      setBlocks(b)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar rotas")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    let ignore = false
    async function startFetching() {
      try {
        const [z, r, b] = await Promise.all([
          fetchJson<Zone[]>("/api/delivery-zones"),
          fetchJson<Route[]>("/api/delivery-routes"),
          fetchJson<Block[]>("/api/delivery-blocks"),
        ])
        if (ignore) return
        setZones(z)
        setRoutes(r)
        setBlocks(b)
        setError(null)
      } catch (e) {
        if (ignore) return
        setError(e instanceof Error ? e.message : "Erro ao carregar rotas")
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    startFetching()
    return () => {
      ignore = true
    }
  }, [isAdmin])

  if (!isAdmin) {
    return (
      <AppShell>
        <Card className="p-8 text-center">
          <Eye className="w-8 h-8 text-muted mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-sm text-muted">Apenas administradores podem configurar rotas de entrega.</p>
        </Card>
      </AppShell>
    )
  }

  async function handleCreateZone() {
    if (!zoneForm.name.trim()) return
    const resp = await fetch("/api/delivery-zones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: zoneForm.name.trim(), active: zoneForm.active }),
    })
    if (!resp.ok) {
      const data = await resp.json().catch(() => null)
      alert(data?.error || "Erro ao criar zona")
      return
    }
    setShowZone(false)
    setZoneForm({ name: "", active: true })
    await load()
  }

  async function handleToggleZone(zone: Zone) {
    await fetch(`/api/delivery-zones/${zone.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: zone.name, active: !zone.active }),
    })
    await load()
  }

  async function handleDeleteZone(zone: Zone) {
    if (!(await confirm(`Excluir a zona "${zone.name}"?`))) return
    const resp = await fetch(`/api/delivery-zones/${zone.id}`, { method: "DELETE" })
    if (!resp.ok) {
      const data = await resp.json().catch(() => null)
      alert(data?.error || "Erro ao excluir zona")
      return
    }
    await load()
  }

  function openCreateRoute() {
    const defaultZone = zones.find((z) => z.active)?.id ?? ""
    setRouteForm({ ...EMPTY_ROUTE_FORM, zoneId: defaultZone })
    setEditingRoute(null)
    setRouteError("")
    setShowRoute(true)
  }

  function openEditRoute(route: Route) {
    setRouteForm({
      name: route.name,
      zoneId: route.zoneId,
      recurring: route.recurring,
      dayOfWeek: String(route.dayOfWeek ?? 2),
      date: dateKeyOf(route.date),
      startDate: dateKeyOf(route.startDate),
      endDate: dateKeyOf(route.endDate),
      cutoffTime: route.cutoffTime,
      cutoffOffsetDays: String(route.cutoffOffsetDays),
      capacityEnabled: route.capacityEnabled,
      maxOrders: route.maxOrders != null ? String(route.maxOrders) : "",
      maxItems: route.maxItems != null ? String(route.maxItems) : "",
      active: route.active,
    })
    setEditingRoute(route)
    setRouteError("")
    setShowRoute(true)
  }

  async function handleSaveRoute() {
    setRouteError("")
    const payload = {
      name: routeForm.name.trim(),
      zoneId: routeForm.zoneId,
      recurring: routeForm.recurring,
      dayOfWeek: routeForm.recurring ? Number(routeForm.dayOfWeek) : null,
      date: routeForm.recurring ? null : routeForm.date || null,
      startDate: routeForm.startDate || null,
      endDate: routeForm.endDate || null,
      cutoffTime: routeForm.cutoffTime,
      cutoffOffsetDays: Number(routeForm.cutoffOffsetDays),
      capacityEnabled: routeForm.capacityEnabled,
      maxOrders: routeForm.capacityEnabled && routeForm.maxOrders ? Number(routeForm.maxOrders) : null,
      maxItems: routeForm.capacityEnabled && routeForm.maxItems ? Number(routeForm.maxItems) : null,
      active: routeForm.active,
    }
    const url = editingRoute ? `/api/delivery-routes/${editingRoute.id}` : "/api/delivery-routes"
    const method = editingRoute ? "PUT" : "POST"
    const resp = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!resp.ok) {
      const data = await resp.json().catch(() => null)
      const issue = data?.details?.[0]?.message
      setRouteError(data?.error + (issue ? `: ${issue}` : "") || "Erro ao salvar rota")
      return
    }
    setShowRoute(false)
    await load()
  }

  async function handleToggleRoute(route: Route) {
    await fetch(`/api/delivery-routes/${route.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !route.active }),
    })
    await load()
  }

  async function handleDeleteRoute(route: Route) {
    if (!(await confirm(`Excluir a rota "${route.name}"?`))) return
    const resp = await fetch(`/api/delivery-routes/${route.id}`, { method: "DELETE" })
    if (!resp.ok) {
      const data = await resp.json().catch(() => null)
      alert(data?.error || "Erro ao excluir rota")
      return
    }
    await load()
  }

  function openCreateBlock() {
    setBlockForm({ zoneId: zones.find((z) => z.active)?.id ?? "", date: "", reason: "" })
    setShowBlock(true)
  }

  async function handleCreateBlock() {
    if (!blockForm.date || !blockForm.zoneId) return
    const resp = await fetch("/api/delivery-blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zoneId: blockForm.zoneId, date: blockForm.date, reason: blockForm.reason || null }),
    })
    if (!resp.ok) {
      const data = await resp.json().catch(() => null)
      alert(data?.error || "Erro ao bloquear data")
      return
    }
    setShowBlock(false)
    await load()
  }

  async function handleDeleteBlock(block: Block) {
    if (!(await confirm("Remover este bloqueio?"))) return
    await fetch(`/api/delivery-blocks/${block.id}`, { method: "DELETE" })
    await load()
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">Rotas de entrega</h1>
            <p className="text-sm text-muted">
              {zones.length} zona(s) · {routes.length} rota(s) · {blocks.length} bloqueio(s)
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={openCreateBlock}>
              <Ban className="w-4 h-4" /> Bloquear data
            </Button>
            <Button onClick={openCreateRoute}>
              <Plus className="w-4 h-4" /> Nova Rota
            </Button>
          </div>
        </div>

        {error && <ErrorState message={error} onRetry={load} />}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} padded={false} className="p-4">
                <Skeleton className="h-4 w-48 mb-2" />
                <Skeleton className="h-3 w-72" />
              </Card>
            ))}
          </div>
        ) : (
          <>
            <Card padded={false}>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
                <MapPin className="w-4 h-4 text-muted" strokeWidth={1.5} />
                <span className="text-sm font-semibold text-ink">Zonas de entrega</span>
              </div>
              <div className="divide-y divide-line">
                {zones.map((zone) => (
                  <div key={zone.id} className="flex items-center gap-3 p-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-ink">{zone.name}</p>
                        <Badge variant={zone.active ? "success" : "neutral"}>{zone.active ? "Ativa" : "Inativa"}</Badge>
                      </div>
                      <p className="text-xs text-muted">
                        {zone._count?.routes ?? 0} rota(s) · {zone._count?.orders ?? 0} pedido(s)
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => handleToggleZone(zone)} aria-label={zone.active ? "Desativar" : "Ativar"}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteZone(zone)} aria-label="Excluir zona">
                        <span className="text-danger"><Trash2 className="w-4 h-4" /></span>
                      </Button>
                    </div>
                  </div>
                ))}
                {zones.length === 0 && (
                  <p className="text-center text-sm text-muted py-8">Nenhuma zona cadastrada</p>
                )}
                <div className="p-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => { setZoneForm({ name: "", active: true }); setShowZone(true); }}
                  >
                    <Store className="w-4 h-4" /> Nova zona
                  </Button>
                </div>
              </div>
            </Card>

            <Card padded={false}>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
                <Truck className="w-4 h-4 text-muted" strokeWidth={1.5} />
                <span className="text-sm font-semibold text-ink">Rotas</span>
              </div>
              <div className="divide-y divide-line">
                {routes.map((route) => (
                  <div key={route.id} className="flex items-start gap-3 p-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-ink">{route.name}</p>
                        <Badge variant={route.active ? "success" : "neutral"}>{route.active ? "Ativa" : "Inativa"}</Badge>
                        {route.recurring ? (
                          <Badge variant="info">Recorrente</Badge>
                        ) : (
                          <Badge variant="accent">Extraordinária</Badge>
                        )}
                        {route.capacityEnabled && (
                          <Badge variant="warning">Capacidade on</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted mt-0.5">
                        {route.zone?.name} · {routeSummary(route)}
                      </p>
                      {route.capacityEnabled && (
                        <p className="text-xs text-muted mt-0.5">
                          <Clock className="w-3 h-3 inline" /> máx {route.maxOrders ?? "∞"} pedidos · {route.maxItems ?? "∞"} itens
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => handleToggleRoute(route)} aria-label={route.active ? "Desativar" : "Ativar"}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEditRoute(route)} aria-label="Editar rota">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteRoute(route)} aria-label="Excluir rota">
                        <span className="text-danger"><Trash2 className="w-4 h-4" /></span>
                      </Button>
                    </div>
                  </div>
                ))}
                {routes.length === 0 && (
                  <p className="text-center text-sm text-muted py-8">Nenhuma rota cadastrada</p>
                )}
              </div>
            </Card>

            <Card padded={false}>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
                <Ban className="w-4 h-4 text-muted" strokeWidth={1.5} />
                <span className="text-sm font-semibold text-ink">Datas bloqueadas</span>
              </div>
              <div className="divide-y divide-line">
                {blocks.map((block) => (
                  <div key={block.id} className="flex items-center gap-3 p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink">{dateKeyOf(block.date)}</p>
                      {block.reason && <p className="text-xs text-muted">{block.reason}</p>}
                    </div>
                    <p className="text-xs text-muted shrink-0">{block.zone?.name}</p>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteBlock(block)} aria-label="Remover bloqueio">
                      <span className="text-danger"><Trash2 className="w-4 h-4" /></span>
                    </Button>
                  </div>
                ))}
                {blocks.length === 0 && (
                  <p className="text-center text-sm text-muted py-8">Nenhuma data bloqueada</p>
                )}
              </div>
            </Card>
          </>
        )}

        {showZone && (
          <Modal
            open
            onClose={() => setShowZone(false)}
            title="Nova zona"
            size="sm"
            footer={
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setShowZone(false)}>Cancelar</Button>
                <Button className="flex-1" onClick={handleCreateZone}>Salvar</Button>
              </div>
            }
          >
            <div className="p-4 space-y-3">
              <FormField label="Nome da zona" required>
                <Input type="text" placeholder="Ex.: São Paulo" value={zoneForm.name} onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })} />
              </FormField>
            </div>
          </Modal>
        )}

        {showRoute && (
          <Modal
            open
            onClose={() => setShowRoute(false)}
            title={editingRoute ? `Editar rota ${editingRoute.name}` : "Nova rota"}
            size="lg"
            footer={
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setShowRoute(false)}>Cancelar</Button>
                <Button className="flex-1" onClick={handleSaveRoute}>Salvar</Button>
              </div>
            }
          >
            <div className="p-4 space-y-4">
              {routeError && <p className="text-sm text-danger">{routeError}</p>}
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Nome da rota" required>
                  <Input type="text" placeholder="Ex.: Rota Terça" value={routeForm.name} onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })} />
                </FormField>
                <FormField label="Zona" required>
                  <select value={routeForm.zoneId} onChange={(e) => setRouteForm({ ...routeForm, zoneId: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors">
                    <option value="">Selecionar</option>
                    {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                </FormField>
              </div>

              <div>
                <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">Tipo</p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setRouteForm({ ...routeForm, recurring: true })} className={`h-10 rounded-lg border text-sm font-medium transition-colors ${routeForm.recurring ? "border-ink bg-ink text-paper" : "border-line text-ink hover:bg-cream"}`}>
                    Recorrente (semanal)
                  </button>
                  <button type="button" onClick={() => setRouteForm({ ...routeForm, recurring: false })} className={`h-10 rounded-lg border text-sm font-medium transition-colors ${!routeForm.recurring ? "border-ink bg-ink text-paper" : "border-line text-ink hover:bg-cream"}`}>
                    Extraordinária (data fixa)
                  </button>
                </div>
              </div>

              {routeForm.recurring ? (
                <div className="grid grid-cols-3 gap-3">
                  <FormField label="Dia da semana">
                    <select value={routeForm.dayOfWeek} onChange={(e) => setRouteForm({ ...routeForm, dayOfWeek: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors">
                      <option value="1">Segunda</option>
                      <option value="2">Terça</option>
                      <option value="3">Quarta</option>
                      <option value="4">Quinta</option>
                      <option value="5">Sexta</option>
                      <option value="6">Sábado</option>
                      <option value="7">Domingo</option>
                    </select>
                  </FormField>
                  <FormField label="Início">
                    <Input type="date" value={routeForm.startDate} onChange={(e) => setRouteForm({ ...routeForm, startDate: e.target.value })} />
                  </FormField>
                  <FormField label="Fim">
                    <Input type="date" value={routeForm.endDate} onChange={(e) => setRouteForm({ ...routeForm, endDate: e.target.value })} />
                  </FormField>
                </div>
              ) : (
                <FormField label="Data da rota" required>
                  <Input type="date" value={routeForm.date} onChange={(e) => setRouteForm({ ...routeForm, date: e.target.value })} />
                </FormField>
              )}

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Fechar pedidos às">
                  <Input type="time" value={routeForm.cutoffTime} onChange={(e) => setRouteForm({ ...routeForm, cutoffTime: e.target.value })} />
                </FormField>
                <FormField label="Dias antes da rota">
                  <Input type="number" min="0" max="7" value={routeForm.cutoffOffsetDays} onChange={(e) => setRouteForm({ ...routeForm, cutoffOffsetDays: e.target.value })} />
                </FormField>
              </div>

              <div className="flex items-center justify-between border border-line rounded-lg p-3">
                <div>
                  <p className="text-sm font-medium text-ink">Limite de capacidade</p>
                  <p className="text-xs text-muted">Restringe pedidos e itens por rota/data</p>
                </div>
                <input
                  type="checkbox"
                  checked={routeForm.capacityEnabled}
                  onChange={(e) => setRouteForm({ ...routeForm, capacityEnabled: e.target.checked })}
                  className="w-5 h-5 accent-ink"
                />
              </div>

              {routeForm.capacityEnabled && (
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Máx. pedidos">
                    <Input type="number" min="1" value={routeForm.maxOrders} onChange={(e) => setRouteForm({ ...routeForm, maxOrders: e.target.value })} placeholder="Sem limite" />
                  </FormField>
                  <FormField label="Máx. itens (cookies)">
                    <Input type="number" min="1" value={routeForm.maxItems} onChange={(e) => setRouteForm({ ...routeForm, maxItems: e.target.value })} placeholder="Sem limite" />
                  </FormField>
                </div>
              )}

              <div className="flex items-center justify-between border border-line rounded-lg p-3">
                <div>
                  <p className="text-sm font-medium text-ink">Rota ativa</p>
                  <p className="text-xs text-muted">Inativa, a rota não aparece para o cliente</p>
                </div>
                <input
                  type="checkbox"
                  checked={routeForm.active}
                  onChange={(e) => setRouteForm({ ...routeForm, active: e.target.checked })}
                  className="w-5 h-5 accent-ink"
                />
              </div>
            </div>
          </Modal>
        )}

        {showBlock && (
          <Modal
            open
            onClose={() => setShowBlock(false)}
            title="Bloquear data"
            size="sm"
            footer={
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setShowBlock(false)}>Cancelar</Button>
                <Button className="flex-1" onClick={handleCreateBlock}>Bloquear</Button>
              </div>
            }
          >
            <div className="p-4 space-y-3">
              <FormField label="Zona">
                <select value={blockForm.zoneId} onChange={(e) => setBlockForm({ ...blockForm, zoneId: e.target.value })} className="w-full h-10 px-3 border border-line rounded-lg text-sm text-ink bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus:border-ink transition-colors">
                  <option value="">Selecionar</option>
                  {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </FormField>
              <FormField label="Data" required>
                <Input type="date" value={blockForm.date} onChange={(e) => setBlockForm({ ...blockForm, date: e.target.value })} />
              </FormField>
              <FormField label="Motivo">
                <Input type="text" placeholder="Ex.: Feriado" value={blockForm.reason} onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })} />
              </FormField>
            </div>
          </Modal>
        )}
      </div>
      {dialog}
    </AppShell>
  )
}
