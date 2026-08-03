"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Minus, Plus, Trash2, ArrowRight, ShoppingBag, Cookie, Truck, Store, Clock } from "lucide-react"
import NextImage from "next/image"
import { CustomerShell } from "@/components/customer/CustomerShell"
import { useCart } from "@/hooks/useCart"
import { usePricing } from "@/hooks/usePricing"
import { useCountdown } from "@/hooks/useCountdown"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { FormField } from "@/components/ui/FormField"

type CatalogProduct = {
  id: string
  name: string
  category: string
  price: number
  unit: string
  image: string | null
}

type DeliverySlot = {
  date: string
  routeId: string
  routeName: string
  zoneId: string
  zoneName: string
  weekdayLabel: string
  dateLabel: string
  cutoffAt: string
  cutoffLabel: string
  cutoffOffsetDays: number
  open: boolean
  capacity: {
    enabled: boolean
    maxOrders: number | null
    maxItems: number | null
    usedOrders: number
    usedItems: number
  }
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

const EMPTY_ADDRESS: AddressState = { cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" }

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

export default function CarrinhoPage() {
  const router = useRouter()
  const { items, setQty, removeItem, clear, count } = useCart()
  const { result, loading: pricingLoading, error: pricingError, formatBRL } = usePricing()
  const [products, setProducts] = useState<Record<string, CatalogProduct>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [mode, setMode] = useState<"retirada" | "entrega">("retirada")
  const [slots, setSlots] = useState<DeliverySlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState("")
  const [selectedSlot, setSelectedSlot] = useState<DeliverySlot | null>(null)
  const [address, setAddress] = useState<AddressState>(EMPTY_ADDRESS)

  const countdown = useCountdown(selectedSlot?.cutoffAt ?? null)

  useEffect(() => {
    fetch("/api/public/catalog")
      .then((r) => {
        if (r.status === 401) {
          router.push(`/entrar?next=${encodeURIComponent("/carrinho")}`)
          return null
        }
        return r.json()
      })
      .then((data) => {
        if (!data) return
        const map: Record<string, CatalogProduct> = {}
        for (const p of data) map[p.id] = p
        setProducts(map)
      })
      .finally(() => setLoading(false))
  }, [router])

  useEffect(() => {
    if (mode !== "entrega") return
    let cancelled = false
    fetch("/api/public/delivery-slots")
      .then((r) => {
        if (r.status === 401) {
          router.push(`/entrar?next=${encodeURIComponent("/carrinho")}`)
          return null
        }
        return r.json()
      })
      .then((data) => {
        if (cancelled || !data) return
        const next: DeliverySlot[] = data?.slots ?? []
        setSlots(next)
        setSelectedSlot((prev) =>
          prev && next.some((s) => s.routeId === prev.routeId && s.date === prev.date) ? prev : next[0] ?? null,
        )
      })
      .catch(() => {
        if (!cancelled) setSlotsError("Não foi possível carregar as datas de entrega")
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [mode, router])

  useEffect(() => {
    if (mode !== "entrega") return
    fetch("/api/public/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => {
        if (!me) return
        setAddress((prev) => ({
          cep: me.addressCep || prev.cep,
          street: me.addressStreet || prev.street,
          number: me.addressNumber || prev.number,
          complement: me.addressComplement || prev.complement,
          neighborhood: me.addressNeighborhood || prev.neighborhood,
          city: me.addressCity || prev.city,
          state: me.addressState || prev.state,
        }))
      })
      .catch(() => {})
  }, [mode])

  const lines = items
    .map((i) => ({ ...i, product: products[i.productId] }))
    .filter((l) => l.product)

  // Usar Pricing Engine v2 quando disponível, caso contrário usar cálculo simples
  const total = pricingResult?.total ?? lines.reduce((s, l) => s + l.product.price * l.qty, 0)

  function setField<K extends keyof AddressState>(key: K, value: string) {
    setAddress((prev) => ({ ...prev, [key]: value }))
  }

  async function handleCheckout() {
    setError("")
    if (mode === "entrega") {
      if (!selectedSlot) {
        setError("Selecione uma data de entrega")
        return
      }
      if (!address.street || !address.number || !address.city || !address.state) {
        setError("Preencha o endereço de entrega (rua, número, cidade e estado)")
        return
      }
    }
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        items: lines.map((l) => ({ productId: l.productId, qty: l.qty })),
      }
      if (mode === "entrega" && selectedSlot) {
        body.deliveryDate = selectedSlot.date
        body.deliveryRouteId = selectedSlot.routeId
        body.deliveryCep = address.cep || null
        body.deliveryStreet = address.street
        body.deliveryNumber = address.number
        body.deliveryComplement = address.complement || null
        body.deliveryNeighborhood = address.neighborhood || null
        body.deliveryCity = address.city
        body.deliveryState = address.state
      }
      const res = await fetch("/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.status === 401) {
        const next = encodeURIComponent("/carrinho")
        router.push(`/entrar?next=${next}`)
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error || "Não foi possível finalizar o pedido")
        return
      }
      const order = await res.json()
      clear()
      router.push(`/pedido/${order.id}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <CustomerShell cartCount={count}>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Carrinho</h1>
          <p className="text-sm text-muted">Revise seu pedido antes de finalizar</p>
        </div>

        {loading && <div className="text-center py-12 text-muted">Carregando...</div>}
        {pricingLoading && <div className="text-center py-12 text-muted">Calculando preço...</div>}

        {!loading && lines.length === 0 && (
          <Card padded={false} className="text-center py-12">
            <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-muted" />
            <p className="text-muted text-sm">Seu carrinho está vazio</p>
            <Button variant="primary" size="sm" className="mt-3" onClick={() => router.push("/cardapio")}>
              Ver cardápio
            </Button>
          </Card>
        )}

        {!loading && lines.length > 0 && (
          <>
            <div className="space-y-2">
              {lines.map((l) => (
                <Card key={l.productId} padded={false} className="flex items-center gap-3 p-3">
                  {l.product.image ? (
                    <NextImage src={l.product.image} alt={l.product.name} width={44} height={44} unoptimized className="w-11 h-11 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-11 h-11 rounded-lg bg-cream border border-line flex items-center justify-center shrink-0">
                      <Cookie className="w-5 h-5 text-kraft" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">{l.product.name}</p>
                    <p className="text-xs text-muted">{formatBRL(l.product.price)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="icon" onClick={() => setQty(l.productId, l.qty - 1)} aria-label="Diminuir">
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-6 text-center text-sm font-semibold text-ink">{l.qty}</span>
                    <Button variant="primary" size="icon" onClick={() => setQty(l.productId, l.qty + 1)} aria-label="Aumentar">
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => removeItem(l.productId)} aria-label="Remover">
                      <Trash2 className="w-4 h-4 text-danger" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            <Card padded={false}>
              <div className="p-4">
                <p className="text-sm font-semibold text-ink mb-3">Como você quer receber?</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMode("retirada")}
                    className={`flex items-center justify-center gap-2 h-12 rounded-lg border text-sm font-medium transition-colors ${mode === "retirada" ? "border-ink bg-ink text-paper" : "border-line text-ink hover:bg-cream"}`}
                  >
                    <Store className="w-4 h-4" /> Retirar na loja
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode("entrega"); setSlotsLoading(true); setSlotsError("") }}
                    className={`flex items-center justify-center gap-2 h-12 rounded-lg border text-sm font-medium transition-colors ${mode === "entrega" ? "border-ink bg-ink text-paper" : "border-line text-ink hover:bg-cream"}`}
                  >
                    <Truck className="w-4 h-4" /> Entrega agendada
                  </button>
                </div>
              </div>

              {mode === "entrega" && (
                <div className="border-t border-line p-4 space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-ink mb-2">Escolha a data da entrega</p>
                    {slotsLoading && <p className="text-sm text-muted">Carregando datas...</p>}
                    {slotsError && <p className="text-sm text-danger">{slotsError}</p>}
                    {!slotsLoading && !slotsError && slots.length === 0 && (
                      <p className="text-sm text-muted">Não há rotas de entrega disponíveis no momento.</p>
                    )}
                    {!slotsLoading && slots.length > 0 && (
                      <div className="space-y-2">
                        {slots.map((slot) => {
                          const active = selectedSlot?.routeId === slot.routeId && selectedSlot?.date === slot.date
                          const full = slot.capacity.enabled && ((slot.capacity.maxOrders != null && slot.capacity.usedOrders >= slot.capacity.maxOrders) || (slot.capacity.maxItems != null && slot.capacity.usedItems >= slot.capacity.maxItems))
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
                              {full && (
                                <p className="text-xs mt-1 font-medium text-danger">Rota lotada</p>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )}
                    {selectedSlot && (
                      <p className="mt-2 text-xs text-muted flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Fecha em <span className="font-semibold text-ink">{countdown}</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-ink">Endereço de entrega</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-1">
                        <FormField label="CEP">
                          <Input type="text" inputMode="numeric" placeholder="00000-000" value={address.cep} onChange={(e) => setField("cep", e.target.value)} />
                        </FormField>
                      </div>
                      <div className="col-span-2">
                        <FormField label="Cidade">
                          <Input type="text" value={address.city} onChange={(e) => setField("city", e.target.value)} />
                        </FormField>
                      </div>
                    </div>
                    <FormField label="Rua *">
                      <Input type="text" value={address.street} onChange={(e) => setField("street", e.target.value)} />
                    </FormField>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField label="Número *">
                        <Input type="text" value={address.number} onChange={(e) => setField("number", e.target.value)} />
                      </FormField>
                      <FormField label="Complemento">
                        <Input type="text" value={address.complement} onChange={(e) => setField("complement", e.target.value)} />
                      </FormField>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <FormField label="Bairro">
                          <Input type="text" value={address.neighborhood} onChange={(e) => setField("neighborhood", e.target.value)} />
                        </FormField>
                      </div>
                      <div>
                        <FormField label="UF *">
                          <Input type="text" maxLength={2} placeholder="SP" value={address.state} onChange={(e) => setField("state", e.target.value.toUpperCase())} />
                        </FormField>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            <div className="flex items-center justify-between border-t border-line pt-3">
              <p className="text-sm text-muted">Total</p>
              <p className="text-lg font-bold text-ink">{formatBRL(total)}</p>
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}
            {pricingError && <p className="text-sm text-danger">{pricingError}</p>}

            <Button size="lg" variant="primary" className="w-full" onClick={handleCheckout} disabled={submitting}>
              {submitting
                ? "Finalizando..."
                : mode === "entrega"
                  ? `Finalizar pedido — entrega em ${selectedSlot?.dateLabel ?? "rota escolhida"}`
                  : "Finalizar pedido — retirada na loja"}
              {!submitting && <ArrowRight className="w-4 h-4" />}
            </Button>
          </>
        )}
      </div>
    </CustomerShell>
  )
}
