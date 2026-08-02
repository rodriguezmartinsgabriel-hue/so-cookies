"use client"

import { useFocusTrap } from "@/hooks/useFocusTrap"
import { AlertTriangle, X } from "lucide-react"

type ConfirmDialogProps = {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Excluir",
  cancelLabel = "Cancelar",
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useFocusTrap(true)

  return (
    <div className="fixed inset-0 z-50 bg-ink/30 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" onClick={onCancel}>
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className="bg-paper rounded-xl border border-line shadow-lg w-full max-w-sm"
      >
        <div className="flex items-start gap-3 p-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${danger ? "bg-danger/10 text-danger" : "bg-ink/10 text-ink"}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 pt-0.5">
            <h3 id="confirm-dialog-title" className="text-base font-bold text-ink">{title}</h3>
            {message && <p className="text-sm text-muted mt-1 leading-relaxed">{message}</p>}
          </div>
          <button onClick={onCancel} data-close-modal aria-label="Fechar" className="p-1.5 -m-1 rounded-md hover:bg-cream text-muted"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 pt-0 flex gap-2">
          <button onClick={onCancel} className="flex-1 h-11 border border-line rounded-lg text-sm font-medium text-ink hover:bg-cream transition-colors">{cancelLabel}</button>
          <button onClick={onConfirm} className={`flex-1 h-11 rounded-lg text-sm font-semibold text-paper transition-colors ${danger ? "bg-danger hover:bg-danger/90" : "bg-ink hover:bg-ink/90"}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
