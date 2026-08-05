"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Package, Clock, Store, Truck, MapPin, X } from "lucide-react"
import { CustomerShell } from "@/components/customer/CustomerShell"
import { OrderStatusTimeline, statusLabel, statusOrder } from "@/components/customer/OrderStatusTimeline"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { FormField } from "@/components/ui/FormField"
import { GlassSurface } from "@/components/ui/GlassSurface"
import { useFocusTrap } from "@/hooks/useFocusTrap"
import { useCart } from "@/hooks/useCart"
import { useHapticFeedback } from "@/hooks/useHapticFeedback"

type PublicOrderItem = {
  id: string
  qty: number
  price: number
  product: { id: string; name: string } | null
  name: string | null
}

type DeliverySlot = {
  date: string
  routeId: string
  routeName: string
  zoneName: string
  dateLabel: string
  cutoffAt: string
  cutoffLabel: string
  windowStart: string
  windowEnd: string
  windowLabel: string
  open: boolean
  capacity: {
    enabled: boolean
    maxOrders: number | null
    maxItems: number | null
    usedOrders: number
    usedItems: number
  }
}

type PublicOrder = {
  id: string
  status: string
  total: number
  pickupCode: string | null
  notes: string | null
  createdAt: string
  deliveryDate: string | null
  deliveryRouteId: string | null
  deliveryRoute?: { id: string; name: string; windowStart?: string; windowEnd?: string } | null
  deliveryAddress: string | null
  deliveryCep: string | null
  deliveryStreet: string | null
  deliveryNumber: string | null
  deliveryComplement: string | null
  deliveryNeighborhood: string | null
  deliveryCity: string | null
  deliveryState: string | null
  items: PublicOrderItem[]
}

type AddressState = {
  cep: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
}

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

function dateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return `${WEEKDAY_SHORT[wd]}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`
}

export default function PedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const [order, setOrder] = useState<PublicOrder | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const { count } = useCart()
  const haptic = useHapticFeedback()

  const [showDeliveryModal, setShowDeliveryModal] = useState(false)
  const [slots, setSlots] = useState<DeliverySlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<DeliverySlot | null>(null)
  const [address, setAddress] = useState<AddressState>({ cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" })
  const [saving, setSaving] = useState(false)
  const deliveryModalRef = useFocusTrap(showDeliveryModal)
  const [deliveryError, setDeliveryError] = useState("")

  const load = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/public/orders/${id}`, { cache: "no-store" })
      if (res.status === 404) {
        setNotFound(true)
        setOrder(null)
        return
      }
      if (!res.ok) return
      const data = await res.json()
      setOrder((prev) => (JSON.stringify(prev) === JSON.stringify(data) ? prev : data))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null
    let cancelled = false

    params.then(({ id }) => {
      if (cancelled) return
      load(id)
      interval = setInterval(() => load(id), 10_000)
    })

    return () => {
      cancelled = true
      if (interval) clearInterval(interval)
    }
  }, [params, load])

  function openDeliveryModal() {
    if (!order) return
    setAddress({
      cep: order.deliveryCep || "",
      street: order.deliveryStreet || "",
      number: order.deliveryNumber || "",
      complement: order.deliveryComplement || "",
      neighborhood: order.deliveryNeighborhood || "",
      city: order.deliveryCity || "",
      state: order.deliveryState || "",
    })
    setDeliveryError("")
    setShowDeliveryModal(true)
    setSlotsLoading(true)
    fetch("/api/public/delivery-slots")
      .then((r) => r.json())
      .then((data) => {
        const next: DeliverySlot[] = data?.slots ?? []
        setSlots(next)
        setSelectedSlot((prev) =>
          prev && next.some((s) => s.routeId === prev.routeId && s.date === prev.date)
            ? prev
            : next.find((s) => s.routeId === order?.deliveryRouteId && s.date === order?.deliveryDate) ?? next[0] ?? null,
        )
      })
      .catch(() => setDeliveryError("Não foi possível carregar as datas de entrega"))
      .finally(() => setSlotsLoading(false))
  }

  async function handleSaveDelivery() {
    if (!order) return
    setDeliveryError("")
    if (!selectedSlot) {
      setDeliveryError("Selecione uma data de entrega")
      return
    }
    if (!address.street || !address.number || !address.city || !address.state) {
      setDeliveryError("Preencha rua, número, cidade e estado para a entrega")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/public/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryDate: selectedSlot.date,
          deliveryRouteId: selectedSlot.routeId,
          deliveryCep: address.cep || null,
          deliveryStreet: address.street,
          deliveryNumber: address.number,
          deliveryComplement: address.complement || null,
          deliveryNeighborhood: address.neighborhood || null,
          deliveryCity: address.city,
          deliveryState: address.state,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setDeliveryError(data?.error || "Não foi possível alterar a entrega")
        return
      }
      setShowDeliveryModal(false)
      await load(order.id)
    } finally {
      setSaving(false)
    }
  }

  const stepIndex = order ? statusOrder.indexOf(order.status) : -1
  const cancelled = order?.status === "CANCELADO"
  const isDelivery = Boolean(order?.deliveryDate)
  const canChange = order?.status === "PENDENTE"

  return (
    <CustomerShell cartCount={count}>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Pedido</h1>
          {order && (
            <p className="text-sm text-muted">
              #{order.id.slice(0, 6)} · {new Date(order.createdAt).toLocaleString("pt-BR")}
            </p>
          )}
        </div>

        {loading && <div className="text-center py-12 text-muted">Carregando pedido...</div>}

        {!loading && notFound && (
          <div className="text-center py-12 text-muted">Pedido não encontrado</div>
        )}

        {!loading && order && (
          <>
            {cancelled ? (
              <div className="border border-danger/30 bg-danger/5 rounded-lg p-4">
                <p className="font-semibold text-danger">Pedido cancelado</p>
                <p className="text-sm text-muted mt-1">Entre em contato com a loja para mais informações.</p>
              </div>
            ) : (
              <>
                <Card className="text-center">
                  {isDelivery ? (
                    <>
                      <p className="text-xs text-muted uppercase tracking-wide mb-1">Entrega agendada</p>
                      <p className="text-2xl font-bold text-ink">{order.deliveryDate ? dateLabel(order.deliveryDate) : "—"}</p>
                      <p className="text-xs text-muted mt-1 flex items-center justify-center gap-1">
                        <Truck className="w-3 h-3" /> {order.deliveryRoute?.name ?? "Entrega"}
                      </p>
                      {order.deliveryRoute?.windowStart && order.deliveryRoute?.windowEnd && (
                        <p className="text-xs text-muted mt-1">
                          Entrega entre {order.deliveryRoute.windowStart} e {order.deliveryRoute.windowEnd}
                        </p>
                      )}
                      {order.deliveryStreet && (
                        <p className="text-xs text-muted mt-2 flex items-start justify-center gap-1 text-left">
                          <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                          <span>
                            {order.deliveryStreet}{order.deliveryNumber ? `, ${order.deliveryNumber}` : ""}
                            {order.deliveryComplement ? ` - ${order.deliveryComplement}` : ""}
                            {order.deliveryNeighborhood ? ` · ${order.deliveryNeighborhood}` : ""}
                            {order.deliveryCity ? ` · ${order.deliveryCity}` : ""}
                            {order.deliveryState ? ` - ${order.deliveryState}` : ""}
                          </span>
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-muted uppercase tracking-wide mb-1">Código de retirada</p>
                      <p className="text-3xl font-bold tracking-[0.3em] text-ink">{order.pickupCode ?? "---"}</p>
                      <p className="text-xs text-muted mt-1 flex items-center justify-center gap-1">
                        <Store className="w-3 h-3" /> Retirada na loja
                      </p>
                    </>
                  )}
                </Card>

                <Card>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-ink flex items-center gap-1.5">
                      <Package className="w-4 h-4" /> Status
                    </p>
                    <span className="text-sm font-semibold text-ink">{statusLabel[order.status]}</span>
                  </div>

                  {stepIndex >= 0 && !cancelled && <OrderStatusTimeline status={order.status} />}
                </Card>

                {canChange && !cancelled && (
                  <Button variant="secondary" size="md" className="w-full" onClick={() => { haptic.selection(); openDeliveryModal() }}>
                    <Truck className="w-4 h-4" />
                    {isDelivery ? "Alterar data / endereço de entrega" : "Agendar entrega"}
                  </Button>
                )}

                <Card>
                  <p className="text-sm font-semibold text-ink mb-2">Itens</p>
                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <span className="text-ink">
                          {item.qty}x {item.product?.name ?? item.name ?? "Item"}
                        </span>
                        <span className="text-muted">{formatBRL(item.price * item.qty)}</span>
                      </div>
                    ))}
                  </div>
                  {order.notes && (
                    <p className="text-xs text-muted mt-3 border-t border-line pt-2">Obs: {order.notes}</p>
                  )}
                  <div className="flex items-center justify-between border-t border-line mt-3 pt-3">
                    <span className="font-semibold text-ink">Total</span>
                    <span className="font-bold text-ink">{formatBRL(order.total)}</span>
                  </div>
                </Card>
              </>
            )}

            <div className="flex justify-center">
              <Link href="/cardapio" className="text-sm text-ink underline">
                Fazer novo pedido
              </Link>
            </div>
          </>
        )}
      </div>

      {showDeliveryModal && order && (
        <div className="fixed inset-0 z-50 bg-ink/30 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="delivery-modal-title">
          <div ref={deliveryModalRef} className="w-full max-w-md max-h-[80vh]">
            <GlassSurface tone="strong" className="rounded-xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-line">
                <div>
                  <h3 id="delivery-modal-title" className="text-lg font-bold text-ink">Entrega agendada</h3>
                  <p className="text-xs text-muted">Escolha uma rota disponível</p>
                </div>
                <button type="button" data-close-modal onClick={() => { haptic.tap(); setShowDeliveryModal(false) }} aria-label="Fechar" className="p-1.5 rounded-md hover:bg-cream text-muted">
                  <X className="w-5 h-5" />
                </button>
              </div>
            <div className="p-4 space-y-4">
              {slotsLoading && <p className="text-sm text-muted text-center py-4">Carregando datas...</p>}
              {!slotsLoading && slots.length === 0 && (
                <p className="text-sm text-muted text-center py-4">Não há rotas abertas no momento.</p>
              )}
              {!slotsLoading && slots.length > 0 && (
                <div className="space-y-2">
                  {slots.map((slot) => {
                    const active = selectedSlot?.routeId === slot.routeId && selectedSlot?.date === slot.date
                    const full =
                      slot.capacity.enabled &&
                      ((slot.capacity.maxOrders != null && slot.capacity.usedOrders >= slot.capacity.maxOrders) ||
                        (slot.capacity.maxItems != null && slot.capacity.usedItems >= slot.capacity.maxItems))
                    return (
                      <button
                        key={`${slot.routeId}-${slot.date}`}
                        type="button"
                        disabled={full}
                        onClick={() => setSelectedSlot(slot)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${full ? "opacity-50 cursor-not-allowed border-line bg-cream/30" : active ? "border-ink bg-ink text-paper" : "border-line bg-paper hover:bg-cream/50"}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm font-semibold ${active ? "text-paper" : "text-ink"}`}>{slot.dateLabel}</span>
                          <span className={`text-xs font-medium ${active ? "text-paper/80" : "text-muted"}`}>{slot.zoneName}</span>
                        </div>
                        <p className={`text-xs mt-1 flex items-center gap-1 ${active ? "text-paper/80" : "text-muted"}`}>
                          <Clock className="w-3 h-3" /> Peça até {slot.cutoffLabel}
                        </p>
                        <p className={`text-xs mt-0.5 flex items-center gap-1 ${active ? "text-paper/80" : "text-muted"}`}>
                          <Truck className="w-3 h-3" /> {slot.windowLabel}
                        </p>
                        {full && <p className="text-xs mt-1 font-medium text-danger">Rota lotada</p>}
                      </button>
                    )
                  })}
                </div>
              )}

              <div className="space-y-3">
                <p className="text-sm font-semibold text-ink">Endereço de entrega</p>
                <div className="grid grid-cols-3 gap-2">
                  <FormField label="CEP">
                    <Input type="text" inputMode="numeric" value={address.cep} onChange={(e) => setAddress({ ...address, cep: e.target.value })} placeholder="00000-000" />
                  </FormField>
                  <div className="col-span-2">
                    <FormField label="Cidade">
                      <Input type="text" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                    </FormField>
                  </div>
                </div>
                <FormField label="Rua *">
                  <Input type="text" value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} />
                </FormField>
                <div className="grid grid-cols-2 gap-2">
                  <FormField label="Número *">
                    <Input type="text" value={address.number} onChange={(e) => setAddress({ ...address, number: e.target.value })} />
                  </FormField>
                  <FormField label="Complemento">
                    <Input type="text" value={address.complement} onChange={(e) => setAddress({ ...address, complement: e.target.value })} />
                  </FormField>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <FormField label="Bairro">
                      <Input type="text" value={address.neighborhood} onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })} />
                    </FormField>
                  </div>
                  <FormField label="UF *">
                    <Input type="text" maxLength={2} placeholder="SP" value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value.toUpperCase() })} />
                  </FormField>
                </div>
              </div>

              {deliveryError && <p className="text-sm text-danger">{deliveryError}</p>}
            </div>
            <div className="p-4 border-t border-line flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setShowDeliveryModal(false)}>Cancelar</Button>
              <Button className="flex-1" onClick={handleSaveDelivery} disabled={saving || slotsLoading}>
                {saving ? "Salvando..." : "Salvar entrega"}
              </Button>
            </div>
          </GlassSurface>
          </div>
        </div>
      )}
    </CustomerShell>
  )
}
