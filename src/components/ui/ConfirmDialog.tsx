"use client"

import { useFocusTrap } from "@/hooks/useFocusTrap"
import { AlertTriangle, X } from "lucide-react"
import { Modal } from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"

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
    <Modal open onClose={onCancel} size="sm">
      <div ref={dialogRef} className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              danger ? "bg-danger/10 text-danger" : "bg-ink/10 text-ink"
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 pt-0.5">
            <h3 className="text-base font-bold text-ink">{title}</h3>
            {message && <p className="text-sm text-muted mt-1 leading-relaxed">{message}</p>}
          </div>
          <button
            onClick={onCancel}
            data-close-modal
            aria-label="Fechar"
            className="p-1.5 -m-1 rounded-md hover:bg-cream text-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" className="flex-1 h-11" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? "danger" : "primary"} className="flex-1 h-11" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
