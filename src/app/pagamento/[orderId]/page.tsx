"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Store, Truck, Clock, QrCode } from "lucide-react"
import { CustomerShell } from "@/components/customer/CustomerShell"
import { PixPaymentPanel } from "@/components/customer/PixPaymentPanel"
import { Card } from "@/components/ui/Card"

const POLL_INTERVAL_MS = 5_000
const POLL_MAX_INTERVAL_MS = 30_000
const POLL_MAX_DURATION_MS = 30 * 60 * 1000

type PublicOrderItem = {
  id: string
  qty: number
  price: number
  product: { id: string; name: string } | null
  name: string | null
}

type PaymentOrder = {
  id: string
  status: string
  total: number
  pickupCode: string | null
  createdAt: string
  deliveryDate: string | null
  deliveryRoute?: { id: string; name: string; windowStart?: string; windowEnd?: string } | null
  deliveryStreet: string | null
  deliveryNumber: string | null
  deliveryComplement: string | null
  deliveryNeighborhood: string | null
  deliveryCity: string | null
  deliveryState: string | null
  items: PublicOrderItem[]
  paymentStatus: string | null
  paymentProvider: string | null
  paymentQrCode: string | null
  paymentQrCodeBase64: string | null
  paymentExpiresAt: string | null
}

const formatBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

export default function PagamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [order, setOrder] = useState<PaymentOrder | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState(false)
  const [retryError, setRetryError] = useState("")

  const load = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/public/orders/${id}`, {
        cache: "no-store",
        credentials: "include",
      })
      if (res.status === 404) {
        setNotFound(true)
        setOrder(null)
        return
      }
      if (res.status === 403) {
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

  const consecutiveErrors = useRef(0)
  const pollStartTime = useRef<number | null>(null)

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null
    let cancelled = false
    pollStartTime.current = Date.now()

    function getInterval(): number {
      if (!pollStartTime.current) return POLL_INTERVAL_MS
      const elapsed = Date.now() - pollStartTime.current
      if (elapsed > POLL_MAX_DURATION_MS) return -1
      const backoff = Math.min(
        POLL_INTERVAL_MS * 2 ** consecutiveErrors.current,
        POLL_MAX_INTERVAL_MS,
      )
      return backoff
    }

    async function tick(id: string) {
      if (document.hidden) return
      await load(id)
    }

    params.then(({ id }) => {
      if (cancelled) return
      if (!id || id === "undefined") {
        setNotFound(true)
        setLoading(false)
        return
      }
      load(id)
      interval = setInterval(() => {
        const nextInterval = getInterval()
        if (nextInterval === -1) {
          if (interval) clearInterval(interval)
          return
        }
        tick(id)
      }, POLL_INTERVAL_MS)
    })

    function handleVisibility() {
      if (!document.hidden && interval) {
        consecutiveErrors.current = 0
        params.then(({ id }) => { if (!cancelled) load(id) })
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      cancelled = true
      if (interval) clearInterval(interval)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [params, load])

  useEffect(() => {
    if (!order) return
    if (order.paymentStatus === "PAGO") {
      consecutiveErrors.current = 0
      return
    }
    consecutiveErrors.current = order.paymentStatus === "EXPIRADO" ? 0 : consecutiveErrors.current
  }, [order])

  useEffect(() => {
    if (order?.paymentStatus === "PAGO") {
      router.replace(`/pedido/${order.id}`)
    }
  }, [order, router])

  async function handleRetry() {
    if (!order) return
    setRetrying(true)
    setRetryError("")
    try {
      const res = await fetch(`/api/public/orders/${order.id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        const code = data?.code as string | undefined
        const message = data?.error || "Não foi possível gerar um novo PIX"
        if (code === "PAYMENTS_DISABLED") {
          setRetryError("Pagamento temporariamente indisponível. Tente novamente em alguns minutos.")
        } else if (code === "INVALID_AMOUNT") {
          setRetryError("Valor do pedido inválido. Entre em contato com o suporte.")
        } else {
          setRetryError(message)
        }
        return
      }
      const updated = await res.json()
      setOrder((prev) => (prev && updated.id === prev.id ? { ...prev, ...updated } : prev))
    } catch {
      setRetryError("Erro de conexão. Verifique sua internet e tente novamente.")
    } finally {
      setRetrying(false)
    }
  }

  const isDelivery = Boolean(order?.deliveryDate)

  return (
    <CustomerShell cartCount={0} showCartBar={false}>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Pagamento</h1>
          <p className="text-sm text-muted">Conclua o pagamento para confirmar seu pedido</p>
        </div>

        {loading && <div className="text-center py-12 text-muted">Carregando pagamento...</div>}

        {!loading && notFound && <div className="text-center py-12 text-muted">Pedido não encontrado</div>}

        {!loading && order && order.paymentStatus === null && (
          <div className="text-center py-12 text-muted">Pedido sem pagamento pendente</div>
        )}

        {!loading && order && order.paymentStatus !== null && (
          <>
            <Card padded={false}>
              <div className="p-4 space-y-1">
                <p className="text-sm font-semibold text-ink flex items-center gap-1.5">
                  <QrCode className="w-4 h-4" /> Pedido #{order.id.slice(0, 6)}
                </p>
                {isDelivery ? (
                  <>
                    <p className="text-xs text-muted flex items-center gap-1">
                      <Truck className="w-3 h-3" /> Entrega · {order.deliveryRoute?.name ?? "Rota"}
                    </p>
                    {order.deliveryStreet && (
                      <p className="text-xs text-muted">
                        {order.deliveryStreet}
                        {order.deliveryNumber ? `, ${order.deliveryNumber}` : ""}
                        {order.deliveryNeighborhood ? ` · ${order.deliveryNeighborhood}` : ""}
                        {order.deliveryCity ? ` · ${order.deliveryCity}` : ""}
                        {order.deliveryState ? ` - ${order.deliveryState}` : ""}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted flex items-center gap-1">
                    <Store className="w-3 h-3" /> Retirada na loja · código {order.pickupCode ?? "—"}
                  </p>
                )}
                <p className="text-xs text-muted">{new Date(order.createdAt).toLocaleString("pt-BR")}</p>
              </div>
            </Card>

            <Card padded={false}>
              <div className="p-4">
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
                <div className="flex items-center justify-between border-t border-line mt-3 pt-3">
                  <span className="font-semibold text-ink">Total</span>
                  <span className="font-bold text-ink">{formatBRL(order.total)}</span>
                </div>
              </div>
            </Card>

            <Card padded={false}>
              <div className="p-4 flex items-center gap-2 text-xs text-muted">
                <Clock className="w-3 h-3 shrink-0" />
                <span>Após o pagamento, o pedido é confirmado automaticamente e você será redirecionado.</span>
              </div>
            </Card>

            <PixPaymentPanel
              order={{
                paymentStatus: order.paymentStatus,
                paymentQrCode: order.paymentQrCode,
                paymentQrCodeBase64: order.paymentQrCodeBase64,
                paymentExpiresAt: order.paymentExpiresAt,
              }}
              onRetry={handleRetry}
              retrying={retrying}
              retryError={retryError}
            />
          </>
        )}
      </div>
    </CustomerShell>
  )
}
