"use client"

import { useState } from "react"
import Image from "next/image"
import { Check, CheckCircle2, Clock, Copy, QrCode, RefreshCw, AlertTriangle } from "lucide-react"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { CountdownLabel } from "@/components/customer/CountdownLabel"
import { useCountdown } from "@/hooks/useCountdown"
import { useHapticFeedback } from "@/hooks/useHapticFeedback"
import { useToast } from "@/components/ui/Toast"

export type PixPaymentOrder = {
  paymentStatus: string | null
  paymentQrCode: string | null
  paymentQrCodeBase64: string | null
  paymentExpiresAt: string | null
}

export function PixPaymentPanel({
  order,
  onRetry,
  retrying,
  retryError,
}: {
  order: PixPaymentOrder
  onRetry: () => void
  retrying: boolean
  retryError: string
}) {
  const haptic = useHapticFeedback()
  const { toast } = useToast()
  const countdown = useCountdown(order.paymentExpiresAt)
  const [copied, setCopied] = useState(false)

  const expiredByTimer = countdown === "Prazo encerrado"
  const paid = order.paymentStatus === "PAGO"
  const hasQrData = Boolean(order.paymentQrCode || order.paymentQrCodeBase64)
  const active = order.paymentStatus === "AGUARDANDO_PAGAMENTO" && hasQrData && !expiredByTimer

  async function handleCopy() {
    const value = order.paymentQrCode
    if (!value) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
      } else {
        const textarea = document.createElement("textarea")
        textarea.value = value
        textarea.style.position = "fixed"
        textarea.style.opacity = "0"
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand("copy")
        document.body.removeChild(textarea)
      }
      setCopied(true)
      haptic.success()
      toast("success", "Código PIX copiado", "Cole no app do seu banco para pagar")
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast("danger", "Não foi possível copiar", "Toque no código abaixo para selecionar e copiar manualmente")
    }
  }

  if (paid) {
    return (
      <Card className="text-center py-6 space-y-2 rounded-2xl">
        <div className="mx-auto w-14 h-14 rounded-full bg-success/10 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-success" />
        </div>
        <p className="text-lg font-bold text-ink">Pagamento confirmado</p>
        <p className="text-sm text-muted">Seu pedido foi confirmado. Acompanhe o status a seguir.</p>
      </Card>
    )
  }

  if (!active) {
    return (
      <Card className="text-center py-6 space-y-3 rounded-2xl">
        <div className="mx-auto w-14 h-14 rounded-full bg-warning/10 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-warning" />
        </div>
        <p className="text-lg font-bold text-ink">Prazo para pagamento encerrado</p>
        <p className="text-sm text-muted">
          Seu pedido foi cancelado e a reserva foi liberada. Gere um novo PIX para tentar novamente.
        </p>
        {retryError && <p className="text-sm text-danger">{retryError}</p>}
        <Button size="lg" className="w-full min-h-12" onClick={onRetry} disabled={retrying}>
          <RefreshCw className={`w-4 h-4 ${retrying ? "animate-spin" : ""}`} />
          {retrying ? "Gerando novo PIX..." : "Gerar novo PIX"}
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-4" aria-live="polite">
      <Card padded={false} className="rounded-2xl">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-ink flex items-center gap-1.5">
              <QrCode className="w-4 h-4" /> Pagar com PIX
            </p>
            <Badge variant="warning">Aguardando pagamento</Badge>
          </div>

          {order.paymentQrCodeBase64 ? (
            <div className="bg-white rounded-xl p-3 mx-auto w-fit">
              <Image
                src={`data:image/png;base64,${order.paymentQrCodeBase64}`}
                alt="QR Code PIX"
                width={208}
                height={208}
                unoptimized
                className="w-52 h-52 rounded-lg"
              />
            </div>
          ) : order.paymentQrCode ? (
            <div className="mx-auto w-fit p-4 rounded-xl border border-line/30 bg-paper/60 text-muted text-center space-y-2">
              <QrCode className="w-8 h-8 mx-auto" />
              <p className="text-xs">QR Code indisponível no momento.</p>
              <p className="text-xs">Use o código PIX copia e cola abaixo.</p>
            </div>
          ) : (
            <div className="mx-auto w-fit p-4 rounded-xl border border-line/30 bg-paper/60 text-muted text-center space-y-2">
              <QrCode className="w-8 h-8 mx-auto" />
              <p className="text-xs">Carregando QR Code...</p>
            </div>
          )}

          <p className="text-center text-xs text-muted mt-3">
            Escaneie o QR Code ou copie o código PIX para pagar em qualquer banco.
          </p>
        </div>
      </Card>

      <Card padded={false} className="rounded-2xl">
        <div className="p-4 space-y-3">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide">PIX copia e cola</p>
          <div className="rounded-xl border border-line/30 bg-paper/60 p-3">
            <code className="block text-xs text-ink break-all select-all whitespace-pre-wrap">
              {order.paymentQrCode}
            </code>
          </div>
          <Button variant="secondary" size="lg" className="w-full min-h-12" onClick={handleCopy}>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Código copiado" : "Copiar código PIX"}
          </Button>
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Clock className="w-3 h-3" />
            <span>
              Expira em <CountdownLabel target={order.paymentExpiresAt} className="font-semibold text-ink" />
            </span>
          </div>
        </div>
      </Card>
    </div>
  )
}
