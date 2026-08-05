"use client"

import { AnimatePresence, motion } from "framer-motion"
import { X, CheckCircle2, Truck } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { formatBRL } from "@/lib/utils"
import type { CatalogProduct } from "@/lib/utils"

type Line = { productId: string; qty: number; product: CatalogProduct }

export function OrderConfirmDialog({
  lines,
  mode,
  selectedSlot,
  address,
  couponCode,
  discountTotal,
  total,
  onConfirm,
  onCancel,
  loading,
}: {
  lines: Line[]
  mode: "retirada" | "entrega"
  selectedSlot: { dateLabel: string; windowLabel: string } | null
  address: { street: string; number: string; neighborhood: string; city: string; state: string } | null
  couponCode: string
  discountTotal: number | undefined
  total: number
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] bg-ink/40 flex items-end justify-center"
        onClick={onCancel}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-paper rounded-t-2xl max-w-md mx-auto w-full p-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] max-h-[80vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-ink">Confirmar pedido</h2>
            <button type="button" onClick={onCancel} className="p-1 -m-1 rounded-md hover:bg-cream text-muted" aria-label="Fechar">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3 mb-4">
            <p className="text-sm font-semibold text-ink">Itens</p>
            {lines.map((l) => (
              <div key={l.productId} className="flex items-center justify-between text-sm">
                <span className="text-ink">{l.qty}x {l.product.name}</span>
                <span className="text-muted">{formatBRL(l.product.price * l.qty)}</span>
              </div>
            ))}
          </div>

          {mode === "entrega" && selectedSlot && (
            <div className="space-y-1 mb-3">
              <p className="text-sm font-semibold text-ink flex items-center gap-1.5"><Truck className="w-4 h-4" /> Entrega</p>
              <p className="text-sm text-ink">{selectedSlot.dateLabel}</p>
              <p className="text-xs text-muted">{selectedSlot.windowLabel}</p>
              {address && (
                <p className="text-xs text-muted">
                  {address.street}, {address.number}
                  {address.neighborhood ? ` · ${address.neighborhood}` : ""}
                  {address.city ? ` · ${address.city}` : ""}
                  {address.state ? ` - ${address.state}` : ""}
                </p>
              )}
            </div>
          )}

          {couponCode && (
            <div className="mb-3">
              <p className="text-sm font-semibold text-ink">Cupom</p>
              <p className="text-xs text-success">{couponCode}{discountTotal ? ` · -${formatBRL(discountTotal)}` : ""}</p>
            </div>
          )}

          <div className="mb-3">
            <p className="text-sm font-semibold text-ink mb-1">Pagamento</p>
            <p className="text-xs text-ink">PIX (QR Code) · pagamento antecipado</p>
            <p className="text-xs text-muted mt-0.5">O pedido é confirmado automaticamente após a confirmação do pagamento.</p>
          </div>

          <div className="flex items-center justify-between border-t border-line pt-3 mb-4">
            <span className="font-semibold text-ink">Total</span>
            <span className="text-xl font-bold text-ink">{formatBRL(total)}</span>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" size="md" className="flex-1" onClick={onCancel} disabled={loading}>
              Voltar
            </Button>
            <Button size="md" className="flex-1" onClick={onConfirm} disabled={loading}>
              {loading ? "Finalizando..." : <><CheckCircle2 className="w-4 h-4" /> Confirmar pedido</>}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
