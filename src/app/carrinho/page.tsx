"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Minus, Plus, Trash2, Cookie, Truck, Store, Clock } from "lucide-react"
import NextImage from "next/image"
import { CustomerShell } from "@/components/customer/CustomerShell"
import { StickyBottomCTA } from "@/components/customer/StickyBottomCTA"
import { CheckoutStepper } from "@/components/customer/CheckoutStepper"
import { OrderNotesField } from "@/components/customer/OrderNotesField"
import { OrderConfirmDialog } from "@/components/customer/OrderConfirmDialog"
import { EmptyState } from "@/components/ui/EmptyState"
import { useCart } from "@/hooks/useCart"
import { usePricing } from "@/hooks/usePricing"
import { useHapticFeedback } from "@/hooks/useHapticFeedback"
import { CountdownLabel } from "@/components/customer/CountdownLabel"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { CalorieBadge } from "@/components/ui/CalorieBadge"
import { ShimmerSkeleton } from "@/components/ui/ShimmerSkeleton"
import { Input } from "@/components/ui/Input"
import { FormField } from "@/components/ui/FormField"
import { motion, AnimatePresence } from "framer-motion"

import type { CatalogProduct } from "@/lib/utils"
import { formatBRL } from "@/lib/utils"
import type { DeliverySlot } from "@/lib/customer-types"
import { EMPTY_ADDRESS, type AddressState } from "@/lib/customer-types"
import { AddressForm } from "@/components/customer/AddressForm"

export default function CarrinhoPage() {
  const router = useRouter()
  const { items, setQty, removeItem, clear, count } = useCart()
  const haptic = useHapticFeedback()
  const [mode, setMode] = useState<"retirada" | "entrega">("retirada")
  const [couponDraft, setCouponDraft] = useState("")
  const [couponCode, setCouponCode] = useState("")
  const { result, loading: pricingLoading, error: pricingError } = usePricing({
    couponCode: couponCode.trim() || null,
    channel: mode === "entrega" ? "delivery" : "pickup",
  })
  const [products, setProducts] = useState<Record<string, CatalogProduct>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [slots, setSlots] = useState<DeliverySlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState("")
  const [selectedSlot, setSelectedSlot] = useState<DeliverySlot | null>(null)
  const [address, setAddress] = useState<AddressState>(EMPTY_ADDRESS)
  const [checkoutStep, setCheckoutStep] = useState<1 | 2 | 3>(1)
  const [orderNotes, setOrderNotes] = useState("")
  const [showConfirm, setShowConfirm] = useState(false)

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
        if (!data) {
          setError("Não foi possível carregar o catálogo")
          return
        }
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
  const total = result?.total ?? lines.reduce((s, l) => s + l.product.price * l.qty, 0)

  function setField<K extends keyof AddressState>(key: K, value: string) {
    setAddress((prev) => ({ ...prev, [key]: value }))
  }

  function validateStep(step: number): string | null {
    if (step === 2) {
      if (mode === "entrega") {
        if (!selectedSlot) return "Selecione uma data de entrega"
        if (!address.street || !address.number || !address.city || !address.state) {
          return "Preencha o endereço de entrega (rua, número, cidade e estado)"
        }
      }
    }
    return null
  }

  function handleAdvance(to: 2 | 3) {
    const error = validateStep(checkoutStep)
    if (error) {
      setError(error)
      return
    }
    setError("")
    setCheckoutStep(to)
  }

  async function handleCheckout() {
    setError("")
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        items: lines.map((l) => ({ productId: l.productId, qty: l.qty })),
      }
      const code = couponCode.trim()
      if (code) body.couponCode = code
      if (orderNotes.trim()) body.notes = orderNotes.trim()
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
      setShowConfirm(false)
      router.push(`/pedido/${order.id}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <CustomerShell cartCount={count} cartTotal={total} showCartBar={false}>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Carrinho</h1>
          <p className="text-sm text-muted">Revise seu pedido antes de finalizar</p>
        </div>

        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <ShimmerSkeleton key={i} variant="card" />
            ))}
          </div>
        )}
        {pricingLoading && (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <ShimmerSkeleton key={i} variant="text" />
            ))}
          </div>
        )}

        {!loading && lines.length === 0 && (
          <EmptyState
            title="Seu carrinho está vazio"
            description="Adicione seus cookies favoritos e aproveite!"
            action={{ label: "Ver cardápio", onClick: () => router.push("/cardapio") }}
          />
        )}

        {!loading && lines.length > 0 && (
          <>
            <CheckoutStepper current={checkoutStep} onStep={setCheckoutStep} />

            {error && <p className="text-sm text-danger">{error}</p>}
            {pricingError && <p className="text-sm text-danger">{pricingError}</p>}

            {checkoutStep === 1 && (
              <>
                <AnimatePresence mode="popLayout">
                  <div className="space-y-2">
                    {lines.map((l) => (
                      <motion.div
                        key={l.productId}
                        layout
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20, height: 0 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                      >
                        <Card key={l.productId} padded={false} className="flex items-center gap-3 p-3">
                      {l.product.image ? (
                        <div className="relative w-16 h-16 shrink-0">
                          <ShimmerSkeleton variant="image" className="absolute inset-0" />
                          <NextImage src={l.product.image} alt={l.product.name} width={64} height={64} unoptimized className="w-16 h-16 rounded-lg object-cover shrink-0 relative" onLoadingComplete={() => {}} loading="lazy" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-cream border border-line flex items-center justify-center shrink-0">
                          <Cookie className="w-6 h-6 text-kraft" />
                        </div>
                      )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-ink truncate">{l.product.name}</p>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-muted">{formatBRL(l.product.price)}</p>
                              <CalorieBadge calories={l.product.nutrition?.caloriesPerUnit ?? null} variant="compact" />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="secondary" size="icon" className="!h-11 !w-11" onClick={() => setQty(l.productId, l.qty - 1)} aria-label="Diminuir">
                              <Minus className="w-4 h-4" />
                            </Button>
                            <motion.span
                              key={l.qty}
                              initial={{ scale: 0.5 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 400, damping: 20 }}
                              className="w-6 text-center text-sm font-semibold text-ink"
                            >
                              {l.qty}
                            </motion.span>
                            <Button variant="primary" size="icon" className="!h-11 !w-11" onClick={() => setQty(l.productId, l.qty + 1)} aria-label="Aumentar">
                              <Plus className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="!h-11 !w-11" onClick={() => removeItem(l.productId)} aria-label="Remover">
                              <Trash2 className="w-4 h-4 text-danger" />
                            </Button>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </AnimatePresence>

                <StickyBottomCTA
                  total={total}
                  itemCount={count}
                  label="Avançar para entrega"
                  onPress={() => handleAdvance(2)}
                  disabled={submitting}
                  loading={submitting}
                />
              </>
            )}

            {checkoutStep === 2 && (
              <Card padded={false}>
                <div className="p-4">
                  <p className="text-sm font-semibold text-ink mb-3">Como você quer receber?</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { haptic.selection(); setMode("retirada") }}
                      className={`flex items-center justify-center gap-2 h-12 rounded-lg border text-sm font-medium transition-colors ${mode === "retirada" ? "border-ink bg-ink text-paper" : "border-line text-ink hover:bg-cream"}`}
                    >
                      <Store className="w-4 h-4" /> Retirar na loja
                    </button>
                    <button
                      type="button"
                      onClick={() => { haptic.selection(); setMode("entrega"); setSlotsLoading(true); setSlotsError("") }}
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
                                <p className={`text-xs mt-0.5 flex items-center gap-1 ${active ? "text-paper/80" : "text-muted"}`}>
                                  <Truck className="w-3 h-3" /> {slot.windowLabel}
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
                        <div className="mt-2 space-y-1">
                          <p className="text-xs text-muted flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Fecha em <CountdownLabel target={selectedSlot.cutoffAt} className="font-semibold text-ink" />
                          </p>
                          <p className="text-xs text-muted flex items-center gap-1">
                            <Truck className="w-3 h-3" /> {selectedSlot.windowLabel}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-ink">Endereço de entrega</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <FormField label="CEP">
                            <Input type="tel" inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" value={address.cep} onChange={(e) => setField("cep", e.target.value)} />
                          </FormField>
                        </div>
                        <div className="col-span-2">
                          <FormField label="Cidade">
                            <Input type="text" autoComplete="address-level2" value={address.city} onChange={(e) => setField("city", e.target.value)} />
                          </FormField>
                        </div>
                      </div>
                      <FormField label="Rua *">
                        <Input type="text" autoComplete="address-line1" value={address.street} onChange={(e) => setField("street", e.target.value)} />
                      </FormField>
                      <div className="grid grid-cols-2 gap-2">
                        <FormField label="Número *">
                          <Input type="text" autoComplete="address-line2" value={address.number} onChange={(e) => setField("number", e.target.value)} />
                        </FormField>
                        <FormField label="Complemento">
                          <Input type="text" autoComplete="address-line2" value={address.complement} onChange={(e) => setField("complement", e.target.value)} />
                        </FormField>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <FormField label="Bairro">
                            <Input type="text" autoComplete="address-level3" value={address.neighborhood} onChange={(e) => setField("neighborhood", e.target.value)} />
                          </FormField>
                        </div>
                        <div>
                          <FormField label="UF *">
                            <Input type="text" maxLength={2} autoComplete="address-level1" placeholder="SP" value={address.state} onChange={(e) => setField("state", e.target.value.toUpperCase())} />
                          </FormField>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t border-line p-4">
                  <StickyBottomCTA
                    total={total}
                    itemCount={count}
                    label="Avançar para revisão"
                    onPress={() => handleAdvance(3)}
                    disabled={submitting}
                    loading={submitting}
                  />
                </div>
              </Card>
            )}

            {checkoutStep === 3 && (
              <>
                <Card padded={false}>
                  <div className="p-4 space-y-3">
                    <p className="text-sm font-semibold text-ink">Resumo dos itens</p>
                    {lines.map((l) => (
                      <div key={l.productId} className="flex items-center justify-between text-sm">
                        <span className="text-ink">{l.qty}x {l.product.name}</span>
                        <span className="text-muted">{formatBRL(l.product.price * l.qty)}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                {mode === "entrega" && selectedSlot && (
                  <Card padded={false}>
                    <div className="p-4 space-y-1">
                      <p className="text-sm font-semibold text-ink flex items-center gap-1.5"><Truck className="w-4 h-4" /> Entrega</p>
                      <p className="text-sm text-ink">{selectedSlot.dateLabel}</p>
                      <p className="text-xs text-muted">{selectedSlot.windowLabel}</p>
                      {address.street && (
                        <p className="text-xs text-muted">
                          {address.street}, {address.number}
                          {address.neighborhood ? ` · ${address.neighborhood}` : ""}
                          {address.city ? ` · ${address.city}` : ""}
                          {address.state ? ` - ${address.state}` : ""}
                        </p>
                      )}
                    </div>
                  </Card>
                )}

                <OrderNotesField value={orderNotes} onChange={setOrderNotes} />

                <Card padded={false}>
                  <div className="p-4 space-y-2">
                    <p className="text-sm font-semibold text-ink">Cupom de desconto</p>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        autoComplete="off"
                        placeholder="Digite o cupom"
                        value={couponDraft}
                        onChange={(e) => setCouponDraft(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && couponDraft.trim()) {
                            setCouponCode(couponDraft.trim().toUpperCase())
                          }
                        }}
                        aria-label="Cupom de desconto"
                      />
                      <Button variant="secondary" size="md" onClick={() => setCouponCode(couponDraft.trim().toUpperCase())} disabled={!couponDraft.trim()}>
                        Aplicar
                      </Button>
                    </div>
                    {couponCode && result?.state.warnings && result.state.warnings.length > 0 && (
                      <ul className="space-y-1">
                        {result.state.warnings.map((w, idx) => (
                          <li key={idx} className="text-xs text-danger">{w.message}</li>
                        ))}
                      </ul>
                    )}
                    {couponCode && result?.summary.discountTotal ? (
                      <p className="text-xs text-success">
                        Desconto aplicado: {formatBRL(result.summary.discountTotal)}
                      </p>
                    ) : null}
                  </div>
                </Card>

                <div className="flex items-center justify-between border-t border-line pt-3">
                  <p className="text-sm text-muted">Total</p>
                  <p className="text-lg font-bold text-ink">{formatBRL(total)}</p>
                </div>

                <StickyBottomCTA
                  total={total}
                  itemCount={count}
                  label="Finalizar pedido"
                  onPress={() => setShowConfirm(true)}
                  disabled={submitting}
                  loading={submitting}
                />
              </>
            )}

            {showConfirm && (
              <OrderConfirmDialog
                lines={lines}
                mode={mode}
                selectedSlot={selectedSlot ? { dateLabel: selectedSlot.dateLabel, windowLabel: selectedSlot.windowLabel } : null}
                address={mode === "entrega" ? { street: address.street, number: address.number, neighborhood: address.neighborhood, city: address.city, state: address.state } : null}
                couponCode={couponCode}
                discountTotal={result?.summary.discountTotal}
                total={total}
                onConfirm={handleCheckout}
                onCancel={() => setShowConfirm(false)}
                loading={submitting}
              />
            )}
          </>
        )}
      </div>
    </CustomerShell>
  )
}
