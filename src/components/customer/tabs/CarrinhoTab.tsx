"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Minus, Plus, Trash2, Cookie, Truck, Store, Clock } from "lucide-react"
import NextImage from "next/image"
import { StickyBottomCTA } from "@/components/customer/StickyBottomCTA"
import { CheckoutStepper } from "@/components/customer/CheckoutStepper"
import { OrderNotesField } from "@/components/customer/OrderNotesField"
import { OrderConfirmDialog } from "@/components/customer/OrderConfirmDialog"
import { PageHeader } from "@/components/customer/PageHeader"
import { SectionCard } from "@/components/customer/SectionCard"
import { EmptyState } from "@/components/ui/EmptyState"
import { useCart } from "@/hooks/useCart"
import { usePricing } from "@/hooks/usePricing"
import { useHapticFeedback } from "@/hooks/useHapticFeedback"
import { CountdownLabel } from "@/components/customer/CountdownLabel"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { CalorieBadge } from "@/components/ui/CalorieBadge"
import { Skeleton } from "@/components/ui/Skeleton"
import { Input } from "@/components/ui/Input"
import { FormField } from "@/components/ui/FormField"
import { PriceTag } from "@/components/customer/PriceTag"
import { VolumeDiscountHint } from "@/components/customer/VolumeDiscountHint"
import { LoyaltyPreview } from "@/components/customer/LoyaltyPreview"
import { motion, AnimatePresence } from "framer-motion"
import { useCatalog, useDeliverySlots, useMe, buildAddressFromProfile } from "@/hooks/customer/queries"

import type { CatalogProduct } from "@/lib/utils"
import { cn, formatBRL } from "@/lib/utils"
import type { DeliverySlot } from "@/lib/customer-types"
import { EMPTY_ADDRESS, type AddressState } from "@/lib/customer-types"

export function CarrinhoTab() {
  const router = useRouter()
  const { items, setQty, removeItem, clear, count } = useCart()
  const haptic = useHapticFeedback()
  const [mode, setMode] = useState<"retirada" | "entrega">("retirada")
  const [couponDraft, setCouponDraft] = useState("")
  const [couponCode, setCouponCode] = useState("")
  const {
    result,
    loading: pricingLoading,
    error: pricingError,
  } = usePricing({
    couponCode: couponCode.trim() || null,
    channel: mode === "entrega" ? "delivery" : "pickup",
  })

  const {
    data: catalogData = [],
    isLoading: catalogLoading,
    isError: catalogError,
  } = useCatalog()
  const products = useMemo(() => {
    const map: Record<string, CatalogProduct> = {}
    for (const p of catalogData) map[p.id] = p
    return map
  }, [catalogData])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const { data: slotsData, isLoading: slotsLoading, isError: slotsError } = useDeliverySlots(mode === "entrega")
  const slots = useMemo(() => slotsData?.slots ?? [], [slotsData])
  const [selectedSlot, setSelectedSlot] = useState<DeliverySlot | null>(null)
  const [address, setAddress] = useState<AddressState>(EMPTY_ADDRESS)
  const [checkoutStep, setCheckoutStep] = useState<1 | 2 | 3>(1)
  const [orderNotes, setOrderNotes] = useState("")
  const [showConfirm, setShowConfirm] = useState(false)
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({})

  const { data: profile } = useMe()

  // Slot efetivo: mantém a escolha do usuário enquanto ela ainda existir na
  // lista de rotas; caso contrário, cai para o primeiro slot disponível.
  const effectiveSlot = useMemo(() => {
    if (selectedSlot && slots.some((s) => s.routeId === selectedSlot.routeId && s.date === selectedSlot.date)) {
      return selectedSlot
    }
    return slots[0] ?? null
  }, [selectedSlot, slots])

  function handleSelectEntrega() {
    haptic.selection()
    setMode("entrega")
    if (profile) setAddress(buildAddressFromProfile(profile))
  }

  const lines = items.map((i) => ({ ...i, product: products[i.productId] })).filter((l) => l.product)

  // Usar Pricing Engine v2 quando disponível, caso contrário usar cálculo simples
  const total = result?.total ?? lines.reduce((s, l) => s + l.product.price * l.qty, 0)

  // Mapa de preço unitário efetivo por produto (com tier aplicado) para o PriceTag.
  const resolvedUnitPriceByProduct = useMemo(() => {
    const map = new Map<string, number>()
    for (const it of result?.state.items ?? []) {
      if (it.qty > 0) map.set(it.productId, it.priceAfterDiscount)
    }
    return map
  }, [result])

  function setField<K extends keyof AddressState>(key: K, value: string) {
    setAddress((prev) => ({ ...prev, [key]: value }))
  }

  function validateStep(step: number): string | null {
    if (step === 2) {
      if (mode === "entrega") {
        if (!effectiveSlot) return "Selecione uma data de entrega"
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
        paymentMethod: "PIX",
        expectedTotal: Math.round(total * 100) / 100,
      }
      const code = couponCode.trim()
      if (code) body.couponCode = code
      if (orderNotes.trim()) body.notes = orderNotes.trim()
      if (mode === "entrega" && effectiveSlot) {
        body.deliveryDate = effectiveSlot.date
        body.deliveryRouteId = effectiveSlot.routeId
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
      router.push(`/pagamento/${order.id}`)
    } finally {
      setSubmitting(false)
    }
  }

  const loading = catalogLoading
  const slotsErrorMsg = slotsError ? "Não foi possível carregar as datas de entrega" : ""
  const catalogErrorMessage = catalogError ? "Não foi possível carregar o catálogo" : ""

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Carrinho" title="Finalize seu pedido" subtitle="Revise os itens e escolha como receber" />

      {loading && (
        <div className="space-y-4">
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={`item-${i}`} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
          {pricingLoading && (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <Skeleton key={`price-${i}`} className="h-4 w-48 rounded-lg" variant="text" />
              ))}
            </div>
          )}
        </div>
      )}
      {!loading && pricingLoading && (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} variant="text" />
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
          {catalogErrorMessage && <p className="text-sm text-danger">{catalogErrorMessage}</p>}
          {pricingError && <p className="text-sm text-danger">{pricingError}</p>}

          {checkoutStep === 1 && (
            <>
              <AnimatePresence mode="popLayout">
                <div className="space-y-2">
                  {lines.map((l) => (
                    <motion.div
                      key={l.productId}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20, scale: 0.97 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                    >
                      <Card padded={false} className="flex items-center gap-2 sm:gap-3 p-3 overflow-hidden rounded-2xl">
                        {l.product.image ? (
                          <div className="relative w-14 h-14 sm:w-16 sm:h-16 shrink-0">
                            <Skeleton
                              variant="image"
                              className={cn(
                                "absolute inset-0 rounded-xl transition-opacity duration-300",
                                loadedImages[l.productId] ? "opacity-0 pointer-events-none" : "opacity-100",
                              )}
                            />
                            <NextImage
                              src={l.product.image}
                              alt={l.product.name}
                              width={64}
                              height={64}
                              unoptimized
                              className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover shrink-0 relative drop-shadow-[0_4px_12px_rgba(0,0,0,0.12)]"
                              onLoadingComplete={() => setLoadedImages((prev) => ({ ...prev, [l.productId]: true }))}
                              onError={() => setLoadedImages((prev) => ({ ...prev, [l.productId]: true }))}
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-cream border border-line flex items-center justify-center shrink-0">
                            <Cookie className="w-6 h-6 text-kraft" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-ink truncate">{l.product.name}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <PriceTag
                              basePrice={l.product.price}
                              qty={l.qty}
                              unit={l.product.unit}
                              tiers={result?.state.availableTiers?.[l.productId]}
                              resolvedUnitPrice={resolvedUnitPriceByProduct.get(l.productId)}
                            />
                            <CalorieBadge calories={l.product.nutrition?.caloriesPerUnit ?? null} variant="compact" />
                          </div>
                          {l.qty > 0 && result?.state.availableTiers?.[l.productId]?.length ? (
                            <div className="mt-1 max-w-[18rem]">
                              <VolumeDiscountHint
                                tiers={result.state.availableTiers[l.productId]}
                                qty={l.qty}
                                basePrice={l.product.price}
                              />
                            </div>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Button
                            variant="secondary"
                            size="icon"
                            className="!h-11 !w-11"
                            onClick={() => setQty(l.productId, l.qty - 1)}
                            aria-label="Diminuir"
                          >
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
                          <Button
                            variant="primary"
                            size="icon"
                            className="!h-11 !w-11"
                            onClick={() => setQty(l.productId, l.qty + 1)}
                            aria-label="Aumentar"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="!h-11 !w-11"
                            onClick={() => removeItem(l.productId)}
                            aria-label="Remover"
                          >
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
            <>
              <Card padded={false} className="rounded-2xl overflow-hidden">
                <div className="p-4">
                  <p className="text-sm font-semibold text-ink mb-3">Como você quer receber?</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        haptic.selection()
                        setMode("retirada")
                      }}
                      className={`flex items-center justify-center gap-2 h-12 rounded-2xl border text-sm font-medium transition-colors ${mode === "retirada" ? "border-ink bg-ink text-paper" : "border-line text-ink hover:bg-cream"}`}
                    >
                      <Store className="w-4 h-4" /> Retirar na loja
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectEntrega}
                      className={`flex items-center justify-center gap-2 h-12 rounded-2xl border text-sm font-medium transition-colors ${mode === "entrega" ? "border-ink bg-ink text-paper" : "border-line text-ink hover:bg-cream"}`}
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
                      {slotsErrorMsg && <p className="text-sm text-danger">{slotsErrorMsg}</p>}
                      {!slotsLoading && !slotsErrorMsg && slots.length === 0 && (
                        <p className="text-sm text-muted">Não há rotas de entrega disponíveis no momento.</p>
                      )}
                      {!slotsLoading && slots.length > 0 && (
                        <div className="space-y-2">
                          {slots.map((slot) => {
                            const active = effectiveSlot?.routeId === slot.routeId && effectiveSlot?.date === slot.date
                            const full =
                              slot.capacity.enabled &&
                              ((slot.capacity.maxOrders != null &&
                                slot.capacity.usedOrders >= slot.capacity.maxOrders) ||
                                (slot.capacity.maxItems != null && slot.capacity.usedItems >= slot.capacity.maxItems))
                            return (
                              <button
                                key={`${slot.routeId}-${slot.date}`}
                                type="button"
                                disabled={full}
                                onClick={() => setSelectedSlot(slot)}
                                className={`w-full text-left p-3 rounded-2xl border transition-colors ${full ? "opacity-50 cursor-not-allowed border-line bg-cream/30" : active ? "border-ink bg-ink text-paper" : "border-line bg-paper hover:bg-cream/50"}`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`text-sm font-semibold ${active ? "text-paper" : "text-ink"}`}>
                                    {slot.dateLabel}
                                  </span>
                                  <span className={`text-xs font-medium ${active ? "text-paper/80" : "text-muted"}`}>
                                    {slot.zoneName}
                                  </span>
                                </div>
                                <p
                                  className={`text-xs mt-1 flex items-center gap-1 ${active ? "text-paper/80" : "text-muted"}`}
                                >
                                  <Clock className="w-3 h-3" /> Peça até {slot.cutoffLabel}
                                </p>
                                <p
                                  className={`text-xs mt-0.5 flex items-center gap-1 ${active ? "text-paper/80" : "text-muted"}`}
                                >
                                  <Truck className="w-3 h-3" /> {slot.windowLabel}
                                </p>
                                {full && <p className="text-xs mt-1 font-medium text-danger">Rota lotada</p>}
                              </button>
                            )
                          })}
                        </div>
                      )}
                      {effectiveSlot && (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs text-muted flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Fecha em{" "}
                            <CountdownLabel target={effectiveSlot.cutoffAt} className="font-semibold text-ink" />
                          </p>
                          <p className="text-xs text-muted flex items-center gap-1">
                            <Truck className="w-3 h-3" /> {effectiveSlot.windowLabel}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-ink">Endereço de entrega</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <FormField label="CEP">
                            <Input
                              type="tel"
                              inputMode="numeric"
                              autoComplete="postal-code"
                              placeholder="00000-000"
                              value={address.cep}
                              onChange={(e) => setField("cep", e.target.value)}
                            />
                          </FormField>
                        </div>
                        <div className="col-span-2">
                          <FormField label="Cidade">
                            <Input
                              type="text"
                              autoComplete="address-level2"
                              value={address.city}
                              onChange={(e) => setField("city", e.target.value)}
                            />
                          </FormField>
                        </div>
                      </div>
                      <FormField label="Rua *">
                        <Input
                          type="text"
                          autoComplete="address-line1"
                          value={address.street}
                          onChange={(e) => setField("street", e.target.value)}
                        />
                      </FormField>
                      <div className="grid grid-cols-2 gap-2">
                        <FormField label="Número *">
                          <Input
                            type="text"
                            autoComplete="address-line2"
                            value={address.number}
                            onChange={(e) => setField("number", e.target.value)}
                          />
                        </FormField>
                        <FormField label="Complemento">
                          <Input
                            type="text"
                            autoComplete="address-line2"
                            value={address.complement}
                            onChange={(e) => setField("complement", e.target.value)}
                          />
                        </FormField>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <FormField label="Bairro">
                            <Input
                              type="text"
                              autoComplete="address-level3"
                              value={address.neighborhood}
                              onChange={(e) => setField("neighborhood", e.target.value)}
                            />
                          </FormField>
                        </div>
                        <div>
                          <FormField label="UF *">
                            <Input
                              type="text"
                              maxLength={2}
                              autoComplete="address-level1"
                              placeholder="SP"
                              value={address.state}
                              onChange={(e) => setField("state", e.target.value.toUpperCase())}
                            />
                          </FormField>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              <StickyBottomCTA
                total={total}
                itemCount={count}
                label="Avançar para revisão"
                onPress={() => handleAdvance(3)}
                disabled={submitting}
                loading={submitting}
              />
            </>
          )}

          {checkoutStep === 3 && (
            <>
              <SectionCard title="Resumo dos itens">
                <div className="p-4 space-y-3">
                  {lines.map((l) => {
                    const resolved = resolvedUnitPriceByProduct.get(l.productId)
                    const hasDiscount = resolved !== undefined && resolved < l.product.price
                    return (
                      <div key={l.productId} className="flex items-center justify-between text-sm gap-3">
                        <span className="text-ink min-w-0 truncate">
                          {l.qty}x {l.product.name}
                        </span>
                        <div className="flex flex-col items-end shrink-0">
                          <span className="font-semibold text-ink">
                            {formatBRL((resolved ?? l.product.price) * l.qty)}
                          </span>
                          {hasDiscount && (
                            <span className="text-[11px] text-muted line-through decoration-muted/60">
                              {formatBRL(l.product.price * l.qty)}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </SectionCard>

              {mode === "entrega" && effectiveSlot && (
                <SectionCard icon={<Truck className="w-4 h-4" />} title="Entrega">
                  <div className="p-4 space-y-1">
                    <p className="text-sm text-ink">{effectiveSlot.dateLabel}</p>
                    <p className="text-xs text-muted">{effectiveSlot.windowLabel}</p>
                    {address.street && (
                      <p className="text-xs text-muted">
                        {address.street}, {address.number}
                        {address.neighborhood ? ` · ${address.neighborhood}` : ""}
                        {address.city ? ` · ${address.city}` : ""}
                        {address.state ? ` - ${address.state}` : ""}
                      </p>
                    )}
                  </div>
                </SectionCard>
              )}

              <OrderNotesField value={orderNotes} onChange={setOrderNotes} />

              <LoyaltyPreview preview={result?.state.loyaltyPreview} />

              <SectionCard title="Cupom de desconto">
                <div className="p-4 space-y-2">
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
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => setCouponCode(couponDraft.trim().toUpperCase())}
                      disabled={!couponDraft.trim()}
                    >
                      Aplicar
                    </Button>
                  </div>
                  {couponCode && result?.state.warnings && result.state.warnings.length > 0 && (
                    <ul className="space-y-1">
                      {result.state.warnings.map((w, idx) => (
                        <li key={idx} className="text-xs text-danger">
                          {w.message}
                        </li>
                      ))}
                    </ul>
                  )}
                  {couponCode && result?.summary.discountTotal ? (
                    <p className="text-xs text-success">
                      Desconto aplicado: {formatBRL(result.summary.discountTotal)}
                    </p>
                  ) : null}
                </div>
              </SectionCard>

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
              selectedSlot={
                effectiveSlot ? { dateLabel: effectiveSlot.dateLabel, windowLabel: effectiveSlot.windowLabel } : null
              }
              address={
                mode === "entrega"
                  ? {
                      street: address.street,
                      number: address.number,
                      neighborhood: address.neighborhood,
                      city: address.city,
                      state: address.state,
                    }
                  : null
              }
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
  )
}
